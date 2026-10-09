import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export interface AuthTokenPayload extends JwtPayload {
  userId: number;
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;

    // A valid signature does not guarantee a usable user identifier.
    const userId: unknown = decoded.userId;
    if (
      typeof userId !== 'number' || !Number.isSafeInteger(userId) ||
      userId <= 0 || userId > 2147483647
    ) {
      return null;
    }
    return { ...decoded, userId };
  } catch {
    return null;
  }
}
