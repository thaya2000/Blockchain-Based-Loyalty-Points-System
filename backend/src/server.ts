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
// Server Start
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     Loyalty Platform Backend API                       ║
║     Running on http://localhost:${PORT}                    ║
╠════════════════════════════════════════════════════════╣
║  Endpoints:                                            ║
║    GET  /health             - Health check             ║
║    GET  /api/platform       - Platform info            ║
║    GET  /api/merchants      - List merchants           ║
║    GET  /api/users/:wallet  - Get user profile         ║
║    GET  /api/rewards        - List rewards             ║
║    POST /api/transactions/* - Log transactions         ║
╚════════════════════════════════════════════════════════╝
  `);
});

export default app;
