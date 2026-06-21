import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { rateLimit } from 'express-rate-limit';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Route imports
import licenseRoutes from './routes/licenses';
import productRoutes from './routes/products';
import apiKeyRoutes from './routes/apiKeys';
import contentRoutes from './routes/content';
import verifyRoutes from './routes/verify';
import authRoutes from './routes/auth';

export function createApp(): Application {
  const app = express();

  // ── Security middleware ────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    })
  );

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  });
  app.use('/api', limiter);

  // ── Request parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ────────────────────────────────────────────────────────────────
  app.use(pinoHttp({ logger }));

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: process.env.npm_package_version ?? '0.1.0' });
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/licenses', licenseRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/api-keys', apiKeyRoutes);
  app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1/verify', verifyRoutes);

  // ── Error handling ─────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
