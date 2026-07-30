import { type Request, type Response, type NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.js";

// Extend Express Request to carry the verified user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
      };
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? "" };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
