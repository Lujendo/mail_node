/**
 * My Mail - Express Server for Shared Hosting
 * Adapted from Cloudflare Workers to run on standard Node.js hosting
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import folderRoutes from './routes/folders';
import contactRoutes from './routes/contacts';
import webhookRoutes from './routes/webhook';
import emailAccountRoutes from './routes/email-accounts';

// Import database initialization
import { initializeDatabase } from './db/init';

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/email-accounts', emailAccountRoutes);
app.use('/api/webhook', webhookRoutes);

// Serve static files (React frontend)
const distPath = path.join(__dirname, '../../dist/client');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize database and start server
async function start() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`🚀 My Mail server running on port ${PORT}`);
      console.log(`📧 Environment: ${NODE_ENV}`);
      console.log(`🌐 CORS origin: ${corsOptions.origin}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;

