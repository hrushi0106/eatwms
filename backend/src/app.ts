import 'express-async-errors';
// MUST be first — override pg type parsers before any DB connections
import './config/bigint';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import path from 'path';

import { env } from './config/env';
import logger from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Fix BigInt serialization handled via pg type parsers in config/bigint.ts

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import departmentRoutes from './modules/departments/department.routes';
import workModeRoutes from './modules/workModes/workMode.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import verificationRoutes from './modules/verifications/verification.routes';
import timesheetRoutes from './modules/timesheets/timesheet.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import leaveRoutes from './modules/leave/leave.routes';
import activityRoutes from './modules/activity/activity.routes';
import engagementRoutes from './modules/engagement/engagement.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import exceptionRoutes from './modules/exceptions/exception.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/report.routes';
import auditRoutes from './modules/audit/audit.routes';
import settingsRoutes from './modules/settings/settings.routes';
import chatbotRoutes from './modules/chatbot/chatbot.routes';

const app = express();

// Trust proxy (for rate limiting behind nginx/load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (!env.isTest()) {
  app.use(pinoHttp({ logger }));
}

// Global rate limiting
app.use(globalRateLimiter);

// Health endpoints (before auth)
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Service is healthy',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
    },
  });
});

app.get('/health/db', async (_req, res) => {
  try {
    const db = (await import('./config/database')).default;
    await db.raw('SELECT 1');
    res.json({
      success: true,
      message: 'Database is healthy',
      data: { status: 'connected' },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      errorCode: 'DB_UNHEALTHY',
    });
  }
});

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/departments', departmentRoutes);
apiRouter.use('/work-modes', workModeRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/verifications', verificationRoutes);
apiRouter.use('/timesheets', timesheetRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/leave', leaveRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/engagement', engagementRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/exceptions', exceptionRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/chatbot', chatbotRoutes);

app.use('/api', apiRouter);

// Serve uploaded files through auth-protected route (handled by verificationRoutes)
// Never serve uploads/ publicly

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'NOT_FOUND',
  });
});

// Global error handler
app.use(errorHandler);

export default app;
