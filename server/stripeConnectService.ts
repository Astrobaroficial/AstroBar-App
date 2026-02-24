import Stripe from 'stripe';
import { db } from './db';
import { users, businesses, stripeConnectAccounts } from '@shared/schema-mysql';
import { eq } from 'drizzle-orm';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe Connect will fail until it is set.');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_missing', {
  apiVersion: '2024-12-18.acacia',
});

export interface ConnectAccountData {
  userId: string;
  businessId?: string;
  accountType: 'business' | 'driver';
  email?: string;
  phone?: string;
  country?: string;
}

export interface OnboardingLinkData {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}

// Crear cuenta Connect para repartidor o negocio
export async function createConnectAccount(data: ConnectAccountData): Promise<string> {
  try {
    // Verificar si ya tiene cuenta Connect
    const existingAccount = await db
      .select()
      .from(stripeConnectAccounts)
      .where(eq(stripeConnectAccounts.userId, data.userId))
      .limit(1);

    if (existingAccount.length > 0) {
      return existingAccount[0].stripeAccountId;
    }

    // Crear cuenta Express en Stripe
    const account = await stripe.accounts.create({
      type: 'express',
      country: data.country || 'MX',
      email: data.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: data.accountType === 'business' ? 'company' : 'individual',
      metadata: {
        userId: data.userId,
        businessId: data.businessId || '',
        accountType: data.accountType,
      },
    });

    // Guardar en base de datos
    await db.insert(stripeConnectAccounts).values({
      userId: data.userId,
      businessId: data.businessId,
      stripeAccountId: account.id,
      accountType: data.accountType,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });

    // Actualizar usuario con stripeAccountId
    await db
      .update(users)
      .set({ stripeAccountId: account.id })
      .where(eq(users.id, data.userId));

    // Si es negocio, actualizar tabla businesses
    if (data.businessId) {
      await db
        .update(businesses)
        .set({ 
          stripeAccountId: account.id,
          stripeAccountStatus: 'pending'
        })
        .where(eq(businesses.id, data.businessId));
    }

    return account.id;
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new Error('Failed to create Connect account');
  }
}

// Crear link de onboarding
export async function createOnboardingLink(data: OnboardingLinkData): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: data.accountId,
      refresh_url: data.refreshUrl,
      return_url: data.returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    throw new Error('Failed to create onboarding link');
  }
}

// Verificar estado de cuenta Connect
export async function getAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
      capabilities: account.capabilities,
    };
  } catch (error) {
    console.error('Error getting account status:', error);
    throw new Error('Failed to get account status');
  }
}

// Actualizar estado de cuenta en base de datos
export async function updateAccountStatus(accountId: string) {
  try {
    const accountStatus = await getAccountStatus(accountId);
    
    await db
      .update(stripeConnectAccounts)
      .set({
        chargesEnabled: accountStatus.chargesEnabled,
        payoutsEnabled: accountStatus.payoutsEnabled,
        detailsSubmitted: accountStatus.detailsSubmitted,
        onboardingComplete: accountStatus.chargesEnabled && accountStatus.payoutsEnabled,
        requirements: JSON.stringify(accountStatus.requirements),
      })
      .where(eq(stripeConnectAccounts.stripeAccountId, accountId));

    // Actualizar tabla businesses si es negocio
    const connectAccount = await db
      .select()
      .from(stripeConnectAccounts)
      .where(eq(stripeConnectAccounts.stripeAccountId, accountId))
      .limit(1);

    if (connectAccount.length > 0 && connectAccount[0].businessId) {
      const status = accountStatus.chargesEnabled && accountStatus.payoutsEnabled 
        ? 'active' 
        : accountStatus.detailsSubmitted 
        ? 'pending' 
        : 'restricted';

      await db
        .update(businesses)
        .set({ stripeAccountStatus: status })
        .where(eq(businesses.id, connectAccount[0].businessId));
    }

    return accountStatus;
  } catch (error) {
    console.error('Error updating account status:', error);
    throw new Error('Failed to update account status');
  }
}

// Crear transferencia a cuenta Connect
export async function createTransfer(accountId: string, amount: number, orderId?: string) {
  try {
    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: 'mxn',
      destination: accountId,
      metadata: {
        orderId: orderId || '',
        type: 'earnings',
      },
    });

    return transfer;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw new Error('Failed to create transfer');
  }
}

// Obtener cuenta Connect por userId
export async function getConnectAccountByUserId(userId: string) {
  try {
    const account = await db
      .select()
      .from(stripeConnectAccounts)
      .where(eq(stripeConnectAccounts.userId, userId))
      .limit(1);

    return account.length > 0 ? account[0] : null;
  } catch (error) {
    console.error('Error getting Connect account:', error);
    return null;
  }
}

// Crear dashboard link para cuenta Connect
export async function createDashboardLink(accountId: string): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    throw new Error('Failed to create dashboard link');
  }
}

// Procesar webhook de Connect
export async function processConnectWebhook(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        await updateAccountStatus(account.id);
        break;
      
      case 'account.application.deauthorized':
        const deauthorizedAccount = event.data.object as Stripe.Account;
        await db
          .update(stripeConnectAccounts)
          .set({
            chargesEnabled: false,
            payoutsEnabled: false,
            onboardingComplete: false,
          })
          .where(eq(stripeConnectAccounts.stripeAccountId, deauthorizedAccount.id));
        break;
    }
  } catch (error) {
    console.error('Error processing Connect webhook:', error);
    throw error;
  }
}

// --------- High-level helpers used by routes ---------

export async function getConnectStatus(userId: string) {
  const account = await getConnectAccountByUserId(userId);
  if (!account) {
    return {
      hasAccount: false,
      onboardingComplete: false,
      canReceivePayments: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirements: null,
    };
  }

  const status = await getAccountStatus(account.stripeAccountId);
  return {
    hasAccount: true,
    accountId: account.stripeAccountId,
    onboardingComplete: status.chargesEnabled && status.payoutsEnabled,
    canReceivePayments: status.chargesEnabled,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    detailsSubmitted: status.detailsSubmitted,
    requirements: status.requirements,
  };
}

export async function startOnboarding(userId: string, businessId?: string) {
  const email = await getUserEmail(userId);
  const accountId = await createConnectAccount({
    userId,
    businessId,
    accountType: businessId ? 'business' : 'driver',
    email,
  });

  const onboardingUrl = await createOnboardingLink({
    accountId,
    refreshUrl: getRefreshUrl(businessId),
    returnUrl: getReturnUrl(businessId),
  });

  return { accountId, onboardingUrl };
}

export async function refreshOnboarding(accountId: string, businessId?: string) {
  const onboardingUrl = await createOnboardingLink({
    accountId,
    refreshUrl: getRefreshUrl(businessId),
    returnUrl: getReturnUrl(businessId),
  });
  return { onboardingUrl };
}

export async function getDashboardLink(accountId: string) {
  const url = await createDashboardLink(accountId);
  return { dashboardUrl: url };
}

// --------- Internal helpers ---------

async function getUserEmail(userId: string) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.email || undefined;
}

function getRefreshUrl(businessId?: string) {
  const frontend = process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'http://localhost:8081';
  return `${frontend}/stripe/refresh${businessId ? `?businessId=${businessId}` : ''}`;
}

function getReturnUrl(businessId?: string) {
  const frontend = process.env.FRONTEND_URL || process.env.EXPO_PUBLIC_FRONTEND_URL || 'http://localhost:8081';
  return `${frontend}/stripe/success${businessId ? `?businessId=${businessId}` : ''}`;
}