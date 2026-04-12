import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string) || auth?.userId;
  if (userId) (req as any).userId = userId;
  next();
};
