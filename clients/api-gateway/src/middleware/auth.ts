import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: any;
  trustScore?: number;
  permissions?: Record<string, boolean>;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined;

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Minimal shape; can be replaced with real lookup later
    const trustScore = typeof decoded?.trustScore === 'number' ? decoded.trustScore : 0;
    req.user = { id: decoded?.sub || decoded?.userId || 'unknown', ...decoded };
    req.trustScore = trustScore;
    req.permissions = {
      canCreateTransactions: trustScore >= 3000,
      canDelegateTrust: trustScore >= 5000,
      canParticipateInDeFi: trustScore >= 4000,
      canSubmitEnvironmentalData: trustScore >= 2000,
      canAccessAdvancedFeatures: trustScore >= 8000,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default authMiddleware;


