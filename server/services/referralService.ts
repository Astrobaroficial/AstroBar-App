import { db } from "../db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Generar código de referido único
export const generateReferralCode = async (userId: string): Promise<string> => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const link = `${process.env.FRONTEND_URL}/register?ref=${code}`;

  await db.execute(sql`
    INSERT INTO referral_codes (id, user_id, code, link)
    VALUES (${uuidv4()}, ${userId}, ${code}, ${link})
  `);

  return code;
};

// Registrar referido
export const registerReferral = async (
  referralCode: string,
  referredUserId: string,
  ipAddress: string,
  deviceId: string
) => {
  const [codeData] = await db.execute(sql`
    SELECT user_id FROM referral_codes WHERE code = ${referralCode} AND is_active = 1
  `);

  if (!codeData || !Array.isArray(codeData) || codeData.length === 0) {
    throw new Error("Código de referido inválido");
  }

  const referrerId = (codeData[0] as any).user_id;

  // Verificar que no se auto-refiera
  if (referrerId === referredUserId) {
    throw new Error("No puedes usar tu propio código de referido");
  }

  // Crear referido
  const referralId = uuidv4();
  await db.execute(sql`
    INSERT INTO referrals (id, referrer_id, referred_id, referral_code, ip_address, device_id)
    VALUES (${referralId}, ${referrerId}, ${referredUserId}, ${referralCode}, ${ipAddress}, ${deviceId})
  `);

  // Actualizar contador
  await db.execute(sql`
    UPDATE referral_codes SET total_referrals = total_referrals + 1 WHERE code = ${referralCode}
  `);

  // Verificar fraude
  await checkReferralFraud(referralId, referrerId, referredUserId, ipAddress, deviceId);

  return referralId;
};

// Detectar fraude
const checkReferralFraud = async (
  referralId: string,
  referrerId: string,
  referredId: string,
  ipAddress: string,
  deviceId: string
) => {
  // Verificar misma IP
  const [sameIp] = await db.execute(sql`
    SELECT COUNT(*) as count FROM referrals 
    WHERE referrer_id = ${referrerId} AND ip_address = ${ipAddress}
  `);

  if ((sameIp[0] as any)?.count > 2) {
    await db.execute(sql`
      INSERT INTO referral_fraud_checks (id, referral_id, fraud_type, severity, details)
      VALUES (${uuidv4()}, ${referralId}, 'same_ip', 'high', 'Múltiples referidos desde la misma IP')
    `);
  }

  // Verificar mismo dispositivo
  const [sameDevice] = await db.execute(sql`
    SELECT COUNT(*) as count FROM referrals 
    WHERE referrer_id = ${referrerId} AND device_id = ${deviceId}
  `);

  if ((sameDevice[0] as any)?.count > 1) {
    await db.execute(sql`
      INSERT INTO referral_fraud_checks (id, referral_id, fraud_type, severity, details)
      VALUES (${uuidv4()}, ${referralId}, 'same_device', 'high', 'Múltiples referidos desde el mismo dispositivo')
    `);
  }
};

// Completar referido (cuando el referido hace su primera compra)
export const completeReferral = async (referredUserId: string, purchaseAmount: number) => {
  const [referral] = await db.execute(sql`
    SELECT id, referrer_id, referral_code FROM referrals 
    WHERE referred_id = ${referredUserId} AND status = 'pending'
    LIMIT 1
  `);

  if (!referral || !Array.isArray(referral) || referral.length === 0) return;

  const referralData = referral[0] as any;
  const rewardAmount = Math.floor(purchaseAmount * 0.1); // 10% de recompensa

  await db.execute(sql`
    UPDATE referrals 
    SET status = 'completed', reward_amount = ${rewardAmount}, first_purchase_at = NOW()
    WHERE id = ${referralData.id}
  `);

  await db.execute(sql`
    UPDATE referral_codes 
    SET successful_referrals = successful_referrals + 1, total_earned = total_earned + ${rewardAmount}
    WHERE code = ${referralData.referral_code}
  `);

  // Agregar puntos al referidor
  await db.execute(sql`
    UPDATE user_points 
    SET total_points = total_points + ${Math.floor(rewardAmount / 100)}
    WHERE user_id = ${referralData.referrer_id}
  `);
};
