// Twilio Verify API Integration for NEMY - Phone-only Authentication
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!VERIFY_SERVICE_SID) {
  console.error("TWILIO_VERIFY_SERVICE_SID is required");
}

// Send 4-digit verification code via SMS
export async function sendVerificationCode(
  phoneNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const verification = await client.verify.v2
      .services(VERIFY_SERVICE_SID!)
      .verifications.create({
        to: formatPhoneNumber(phoneNumber),
        channel: "sms",
        locale: "es",
        customFriendlyName: "NEMY Autlán",
      });

    console.log(
      `📱 Verification code sent to ${phoneNumber}: ${verification.status}`,
    );
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error sending verification code:", error);
    return { success: false, error: error.message };
  }
}

// Verify 4-digit code
export async function verifyCode(
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const verificationCheck = await client.verify.v2
      .services(VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: formatPhoneNumber(phoneNumber),
        code: code,
      });

    const isValid = verificationCheck.status === "approved";

    if (isValid) {
      console.log(`✅ Phone verification successful for ${phoneNumber}`);
    } else {
      console.log(
        `❌ Phone verification failed for ${phoneNumber}: ${verificationCheck.status}`,
      );
    }

    return {
      success: isValid,
      error: isValid ? undefined : "Código incorrecto o expirado",
    };
  } catch (error: any) {
    console.error("❌ Error verifying code:", error);
    return { success: false, error: "Error al verificar código" };
  }
}

// Format phone number for Mexico
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  // Mexican numbers
  if (cleaned.startsWith("52")) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+52${cleaned}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  return `+${cleaned}`;
}

// Check verification status
export async function checkVerificationStatus(
  phoneNumber: string,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const verifications = await client.verify.v2
      .services(VERIFY_SERVICE_SID!)
      .verifications.list({
        to: formatPhoneNumber(phoneNumber),
        limit: 1,
      });

    const latestVerification = verifications[0];
    const verified = latestVerification?.status === "approved";

    return { verified };
  } catch (error: any) {
    console.error("❌ Error checking verification status:", error);
    return { verified: false, error: error.message };
  }
}

// Rate limiting for verification attempts
const verificationAttempts = new Map<
  string,
  { count: number; lastAttempt: Date }
>();

export function canSendVerification(phoneNumber: string): boolean {
  const key = formatPhoneNumber(phoneNumber);
  const now = new Date();
  const attempts = verificationAttempts.get(key);

  if (!attempts) {
    verificationAttempts.set(key, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset counter if more than 1 hour has passed
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  if (attempts.lastAttempt < hourAgo) {
    verificationAttempts.set(key, { count: 1, lastAttempt: now });
    return true;
  }

  // Allow max 5 attempts per hour
  if (attempts.count >= 5) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}
