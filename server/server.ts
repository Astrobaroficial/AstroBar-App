import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import apiRoutes from './apiRoutes';  // ← Volver al original
import devRoutes from './devRoutes';
import financialTestRoute from './financialTestRoute';
import { validateEnv } from './env';

// Validate environment variables at startup so we never run with bad Stripe/Twilio keys
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy - required for rate limiting behind Replit's proxy
app.set('trust proxy', 1);

// Security middleware - disable CSP for SPA
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Request logging with error capture
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      console.error(`❌ ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
      console.error('Response:', data);
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve Expo static bundles (for Expo Go deployment)
const staticBuildPath = path.join(process.cwd(), 'static-build');
app.use('/ios', express.static(path.join(staticBuildPath, 'ios')));
app.use('/android', express.static(path.join(staticBuildPath, 'android')));
// Serve bundle assets with dynamic timestamp paths
app.use(express.static(staticBuildPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// API routes
app.use('/api', apiRoutes);

// Wallet routes (from routes folder)
import walletRoutesV2 from './routes/walletRoutes';
app.use('/api/wallet', walletRoutesV2);

// Favorites routes
import favoritesRoutes from './favoritesRoutes';
console.log('🔧 Registering favorites routes at /api/favorites');
app.use('/api/favorites', favoritesRoutes);

// Stripe Connect routes
import connectRoutes from './connectRoutes';
console.log('🔧 Registering Stripe Connect routes at /api/stripe/connect');
app.use('/api/stripe/connect', connectRoutes);

// Secure payment routes
import securePaymentRoutes from './securePaymentIntegration';
app.use('/api', securePaymentRoutes);

// Financial system test routes
app.use('/api/financial', financialTestRoute);

// Development routes (only in development)
if (!isProduction) {
  app.use('/api', devRoutes);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production (Expo web build)
if (isProduction) {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  
  // SPA fallback - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
} else {
  // Development: just show API is running
  app.get('/', (req, res) => {
    res.json({ 
      message: 'NEMY API Server',
      frontend: process.env.FRONTEND_URL || 'http://localhost:8081',
      docs: '/api',
      financialTests: '/api/financial/test-financial-system'
    });
  });
}

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💰 Financial Tests: http://localhost:${PORT}/api/financial/test-financial-system`);
  
  // Check optional services
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  Stripe not configured - payments disabled');
  }
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn('⚠️  Twilio not configured - SMS disabled');
  }

  // Start business hours cron
  import('./businessHoursCron').then(({ startBusinessHoursCron }) => {
    startBusinessHoursCron();
  }).catch(console.error);
  
  // Start weekly settlement cron
  import('./weeklySettlementCron').then(({ WeeklySettlementCron }) => {
    WeeklySettlementCron.start();
  }).catch(console.error);
  
  // Start cash security cron
  import('./cashSecurityCron').then(({ initializeCashSecurityCron }) => {
    initializeCashSecurityCron();
  }).catch(console.error);
});
