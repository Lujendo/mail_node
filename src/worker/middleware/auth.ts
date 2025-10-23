// Authentication middleware for Hono
import { Context, Next } from 'hono';
import { verifyJWT, type JWTPayload } from '../auth/jwt';

export interface AuthContext {
  user: JWTPayload;
}

/**
 * Middleware to verify JWT token and attach user to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }

  // Attach user to context
  c.set('user', payload);
  
  await next();
}

/**
 * Get authenticated user from context
 */
export function getAuthUser(c: Context): JWTPayload {
  return c.get('user') as JWTPayload;
}

