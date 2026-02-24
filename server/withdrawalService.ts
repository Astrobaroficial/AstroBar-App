import { db } from './db';
import { wallets, withdrawalRequests, users, stripeConnectAccounts } from '../shared/schema-mysql';
import { eq, and, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import * as stripeConnectService from './stripeConnectService';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

const MINIMUM_WITHDRAWAL = 5000; // $50 MXN en centavos

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'stripe' | 'bank_transfer';
  bankAccount?: {
    clabe: string;
    bankName: string;
    accountHolder: string;
  };
}

export class WithdrawalService {
  
  async requestWithdrawal(request: WithdrawalRequest) {
    // 1. Validar usando unifiedFinancialService
    const { financialService } = await import('./unifiedFinancialService');
    const { users } = await import('../shared/schema-mysql');
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const canWithdraw = await financialService.canUserWithdraw(request.userId, user.role);
    if (!canWithdraw.allowed) {
      throw new Error(canWithdraw.reason || 'No puedes retirar en este momento');
    }

    const wallet = await financialService.getWallet(request.userId);
    const availableBalance = wallet.balance - (wallet.cashOwed || 0);

    if (request.amount > availableBalance) {
      throw new Error('Saldo insuficiente');
    }

    // 2. Crear solicitud
    await db.insert(withdrawalRequests).values({
      userId: request.userId,
      walletId: wallet.id,
      amount: request.amount,
      method: request.method,
      bankClabe: request.bankAccount?.clabe,
      bankName: request.bankAccount?.bankName,
      accountHolder: request.bankAccount?.accountHolder,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Obtener la solicitud creada
    const [withdrawal] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, request.userId))
      .orderBy(desc(withdrawalRequests.requestedAt))
      .limit(1);

    // 3. Procesar según método
    if (request.method === 'stripe') {
      return await this.processStripeWithdrawal(withdrawal.id, request.userId, request.amount);
    } else {
      return withdrawal; // Admin procesará manualmente
    }
  }

  private async processStripeWithdrawal(withdrawalId: string, userId: string, amount: number) {
    try {
      // Verificar cuenta Connect
      const connectAccount = await stripeConnectService.getConnectAccountByUserId(userId);
      if (!connectAccount || !connectAccount.payoutsEnabled) {
        throw new Error('Cuenta Stripe Connect no configurada para retiros');
      }

      // Para desarrollo, simular el payout exitoso
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 Simulando payout de Stripe en desarrollo');
        
        // Actualizar solicitud como completada
        await db.update(withdrawalRequests)
          .set({
            status: 'completed',
            stripePayoutId: 'po_test_' + Date.now(),
            completedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, withdrawalId));

        // Descontar de wallet
        await db.update(wallets)
          .set({
            balance: db.raw(`balance - ${amount}`),
            totalWithdrawn: db.raw(`total_withdrawn + ${amount}`)
          })
          .where(eq(wallets.userId, userId));

        return { success: true, payoutId: 'po_test_' + Date.now(), message: 'Retiro simulado exitoso (desarrollo)' };
      }

      if (!stripe) {
        throw new Error('Stripe no está configurado. Usa el método de transferencia bancaria.');
      }

      // Crear payout en Stripe Connect
      const payout = await stripe.payouts.create({
        amount,
        currency: 'mxn',
        method: 'instant',
        metadata: {
          withdrawalId,
          userId,
        },
      }, {
        stripeAccount: connectAccount.stripeAccountId
      });

      // Actualizar solicitud
      await db.update(withdrawalRequests)
        .set({
          status: 'processing',
          stripePayoutId: payout.id,
        })
        .where(eq(withdrawalRequests.id, withdrawalId));

      // Descontar de wallet inmediatamente
      await db.update(wallets)
        .set({
          balance: db.raw(`balance - ${amount}`)
        })
        .where(eq(wallets.userId, userId));

      return { success: true, payoutId: payout.id };
    } catch (error: any) {
      // Marcar como fallido
      await db.update(withdrawalRequests)
        .set({
          status: 'failed',
          errorMessage: error.message,
        })
        .where(eq(withdrawalRequests.id, withdrawalId));

      throw error;
    }
  }

  async getWithdrawalHistory(userId: string) {
    return await db
      .select({
        id: withdrawalRequests.id,
        amount: withdrawalRequests.amount,
        method: withdrawalRequests.method,
        status: withdrawalRequests.status,
        requestedAt: withdrawalRequests.requestedAt,
        completedAt: withdrawalRequests.completedAt,
        errorMessage: withdrawalRequests.errorMessage,
        stripePayoutId: withdrawalRequests.stripePayoutId,
      })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.requestedAt));
  }

  // Admin: Aprobar retiro bancario manual
  async approveWithdrawal(withdrawalId: string, adminId: string) {
    const [withdrawal] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, withdrawalId))
      .limit(1);

    if (!withdrawal || withdrawal.status !== 'pending') {
      throw new Error('Solicitud no válida');
    }

    await db.transaction(async (tx) => {
      // Marcar como completado
      await tx.update(withdrawalRequests)
        .set({
          status: 'completed',
          completedAt: new Date(),
          approvedBy: adminId,
        })
        .where(eq(withdrawalRequests.id, withdrawalId));

      // Descontar de wallet
      await tx.update(wallets)
        .set({
          balance: db.raw(`balance - ${withdrawal.amount}`)
        })
        .where(eq(wallets.userId, withdrawal.userId));
    });

    return { success: true };
  }
}

export const withdrawalService = new WithdrawalService();

// Función independiente para obtener balance de wallet
export async function getWalletBalance(userId: string) {
  try {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!wallet) {
      // Crear wallet si no existe
      await db.insert(wallets).values({
        userId,
        balance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        cashOwed: 0,
      });

      return {
        success: true,
        balance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        cashOwed: 0,
        availableForWithdrawal: 0,
      };
    }

    const availableForWithdrawal = Math.max(0, wallet.balance - (wallet.cashOwed || 0));

    return {
      success: true,
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance || 0,
      totalEarned: wallet.totalEarned || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      cashOwed: wallet.cashOwed || 0,
      availableForWithdrawal,
    };
  } catch (error: any) {
    console.error('Error getting wallet balance:', error);
    throw new Error('Error al obtener balance de wallet');
  }
}

// Función para obtener historial de retiros
export async function getWithdrawalHistory(userId: string) {
  try {
    const withdrawals = await db
      .select({
        id: withdrawalRequests.id,
        amount: withdrawalRequests.amount,
        method: withdrawalRequests.method,
        status: withdrawalRequests.status,
        requestedAt: withdrawalRequests.requestedAt,
        completedAt: withdrawalRequests.completedAt,
        errorMessage: withdrawalRequests.errorMessage,
        stripePayoutId: withdrawalRequests.stripePayoutId,
      })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.requestedAt));

    return {
      success: true,
      withdrawals,
    };
  } catch (error: any) {
    console.error('Error getting withdrawal history:', error);
    throw new Error('Error al obtener historial de retiros');
  }
}

// Función para solicitar retiro
export async function requestWithdrawal(request: WithdrawalRequest) {
  return await withdrawalService.requestWithdrawal(request);
}

// Función para cancelar retiro
export async function cancelWithdrawal(withdrawalId: string, userId: string) {
  try {
    const [withdrawal] = await db
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.id, withdrawalId),
          eq(withdrawalRequests.userId, userId),
          eq(withdrawalRequests.status, 'pending')
        )
      )
      .limit(1);

    if (!withdrawal) {
      throw new Error('Solicitud de retiro no encontrada o no se puede cancelar');
    }

    await db
      .update(withdrawalRequests)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, withdrawalId));

    return {
      success: true,
      message: 'Solicitud de retiro cancelada',
    };
  } catch (error: any) {
    console.error('Error cancelling withdrawal:', error);
    throw new Error('Error al cancelar retiro');
  }
}
