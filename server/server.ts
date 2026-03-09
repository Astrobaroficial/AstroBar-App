import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import apiRoutes from './apiRoutes';
import { validateEnv } from './env';

// Clear module cache to force fresh DB connection
delete require.cache[require.resolve('./db')];

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

// Request logging
app.use((req, res, next) => {
  
  
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      
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

// Wallet routes removed

// Admin Panel routes
import adminPanelRoutes from './routes/adminPanelRoutes';

app.use('/api/admin', adminPanelRoutes);

// FASE 2 routes
import phase2Routes from './routes/phase2Routes';

app.use('/api/phase2', phase2Routes);

// Admin Complete routes
import adminCompleteRoutes from './routes/adminCompleteRoutes';

app.use('/api/admin-complete', adminCompleteRoutes);

// Order routes
import orderRoutes from './routes/orderRoutes';

app.use('/api/orders', orderRoutes);

// Upload routes
import uploadRoutes from './routes/uploadRoutes';

app.use('/api/upload', uploadRoutes);

// Mercado Pago routes
import mercadopagoRoutes from './routes/mercadopagoRoutes';

app.use('/api/mp', mercadopagoRoutes);

// Favorites routes removed

// Stripe Connect routes removed

// Secure payment routes removed

// Development routes removed

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
      message: '🌙 AstroBar API - Promociones Nocturnas',
      location: 'Buenos Aires, Argentina 🇦🇷',
      frontend: process.env.FRONTEND_URL || 'http://localhost:8081',
      docs: '/api'
    });
  });
}

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Start server
app.listen(PORT, async () => {
  
  
  
  
  
  // Initialize audit logs table
  const { createAuditTable } = await import('./routes/auditRoutes');
  await createAuditTable();
  
  if (!process.env.STRIPE_SECRET_KEY) {
    
  }
  if (!process.env.TWILIO_ACCOUNT_SID) {
    
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    
  }
  if (!process.env.EXPO_ACCESS_TOKEN) {
    
  }
});
