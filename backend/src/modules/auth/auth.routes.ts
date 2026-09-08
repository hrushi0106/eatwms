import { Router } from 'express';
import { loginRateLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/authenticate';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import * as controller from './auth.controller';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refresh_token: z.string().min(1) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

router.post('/login', loginRateLimiter, validateBody(loginSchema), controller.loginHandler);
router.post('/logout', authenticate, controller.logoutHandler);
router.get('/me', authenticate, controller.meHandler);
router.post('/refresh', validateBody(refreshSchema), controller.refreshHandler);
router.post('/forgot-password', validateBody(forgotSchema), controller.forgotPasswordHandler);
router.post('/reset-password', validateBody(resetSchema), controller.resetPasswordHandler);

export default router;
