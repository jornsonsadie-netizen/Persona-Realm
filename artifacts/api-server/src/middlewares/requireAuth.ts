import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback_secret_change_me_in_prod";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.auth_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string };
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch (err) {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.userId || !req.userEmail) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.userEmail !== "keyamuha@gmail.com") {
    res.status(403).json({ error: "Forbidden: Admins only" });
    return;
  }

  next();
};
