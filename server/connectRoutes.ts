import { Router } from 'express';
import { authenticateToken } from './authMiddleware';
import * as stripeConnectService from './stripeConnectService';
import { db } from './db';
import { users, businesses } from '../shared/schema-mysql';
import { eq } from 'drizzle-orm';

const router = Router();

// Iniciar onboarding de Stripe Connect
router.post('/onboard', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user!;
    const { accountType, businessId } = req.body;

    // Validar tipo de cuenta
    if (!['business', 'driver'].includes(accountType)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    // Validar permisos
    if (accountType === 'business' && role !== 'business') {
      return res.status(403).json({ error: 'Only business users can create business accounts' });
    }
    if (accountType === 'driver' && role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can create driver accounts' });
    }

    // Obtener datos del usuario
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Crear cuenta Connect
    const accountId = await stripeConnectService.createConnectAccount({
      userId,
      businessId,
      accountType,
      email: user[0].email || undefined,
      phone: user[0].phone,
      country: 'MX',
    });

    // Crear link de onboarding
    const onboardingUrl = await stripeConnectService.createOnboardingLink({
      accountId,
      refreshUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/profile/payment-methods?refresh=true`,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/profile/payment-methods?success=true`,
    });

    res.json({
      success: true,
      accountId,
      onboardingUrl,
    });
  } catch (error) {
    console.error('Connect onboarding error:', error);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

// Obtener estado de cuenta Connect
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user!;

    const connectAccount = await stripeConnectService.getConnectAccountByUserId(userId);
    
    if (!connectAccount) {
      return res.json({
        hasAccount: false,
        onboardingComplete: false,
        canReceivePayments: false,
      });
    }

    const accountStatus = await stripeConnectService.getAccountStatus(connectAccount.stripeAccountId);

    res.json({
      hasAccount: true,
      accountId: connectAccount.stripeAccountId,
      onboardingComplete: connectAccount.onboardingComplete,
      canReceivePayments: connectAccount.chargesEnabled && connectAccount.payoutsEnabled,
      chargesEnabled: connectAccount.chargesEnabled,
      payoutsEnabled: connectAccount.payoutsEnabled,
      detailsSubmitted: connectAccount.detailsSubmitted,
      requirements: connectAccount.requirements ? JSON.parse(connectAccount.requirements) : null,
    });
  } catch (error) {
    console.error('Connect status error:', error);
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

// Crear nuevo link de onboarding (si el anterior expiró)
router.post('/refresh-onboarding', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user!;

    const connectAccount = await stripeConnectService.getConnectAccountByUserId(userId);
    
    if (!connectAccount) {
      return res.status(404).json({ error: 'No Connect account found' });
    }

    const onboardingUrl = await stripeConnectService.createOnboardingLink({
      accountId: connectAccount.stripeAccountId,
      refreshUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/profile/payment-methods?refresh=true`,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/profile/payment-methods?success=true`,
    });

    res.json({
      success: true,
      onboardingUrl,
    });
  } catch (error) {
    console.error('Refresh onboarding error:', error);
    res.status(500).json({ error: 'Failed to refresh onboarding' });
  }
});

// Crear link al dashboard de Stripe
router.post('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user!;

    const connectAccount = await stripeConnectService.getConnectAccountByUserId(userId);
    
    if (!connectAccount) {
      return res.status(404).json({ error: 'No Connect account found' });
    }

    if (!connectAccount.onboardingComplete) {
      return res.status(400).json({ error: 'Onboarding not complete' });
    }

    const dashboardUrl = await stripeConnectService.createDashboardLink(connectAccount.stripeAccountId);

    res.json({
      success: true,
      dashboardUrl,
    });
  } catch (error) {
    console.error('Dashboard link error:', error);
    res.status(500).json({ error: 'Failed to create dashboard link' });
  }
});

// Webhook para eventos de Connect
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    await stripeConnectService.processConnectWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Connect webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;