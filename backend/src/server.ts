import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import merchantsRouter from './routes/merchants.js';
import usersRouter from './routes/users.js';
import rewardsRouter from './routes/rewards.js';
import transactionsRouter from './routes/transactions.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// Middleware
// ============================================

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// Request Timeout & Error Handling
// ============================================

// Set request timeout to 30 seconds
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  res.on('timeout', () => {
    console.warn(`⏱️ Request timeout: ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    }
  });
  
  next();
});

// Global error handler for uncaught errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Request error:', {
    method: req.method,
    path: req.path,
    error: err.message,
  });

  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    });
  }
});

// ============================================
// Routes
// ============================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api/merchants', merchantsRouter);
app.use('/api/users', usersRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);

// Platform info endpoint
app.get('/api/platform', async (_req: Request, res: Response) => {
  try {
    const { solanaService } = await import('./services/solana.service.js');
    
    const [platformPDA] = solanaService.getPlatformStatePDA();
    const [mintPDA] = solanaService.getLoyaltyMintPDA();

    res.json({
      success: true,
      data: {
        programId: process.env.PROGRAM_ID,
        platformStatePDA: platformPDA.toBase58(),
        tokenMintPDA: mintPDA.toBase58(),
        network: 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL,
      },
    });
  } catch (error) {
    console.error('Error fetching platform info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch platform info' });
  }
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================
// Server Start & Graceful Shutdown
// ============================================

const server = app.listen(PORT, () => {
  console.log(`✅ Loyalty Platform Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n📢 ${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Force shutdown (timeout)');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
