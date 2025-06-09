import { Request, Response, NextFunction } from "express";
import * as authService from "../service/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        login: string;
        role: "ADMIN" | "USER";
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "No token provided",
        code: "NO_TOKEN"
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const user = await authService.validateAccessToken(token);
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          error: "Access token expired",
          code: "TOKEN_EXPIRED"
        });
        return;
      }

      if (error.message === "Invalid token type" || error.message === "User not found") {
        res.status(401).json({
          error: error.message,
          code: "INVALID_TOKEN"
        });
        return;
      }
    }

    res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN"
    });
  }
};

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Access denied: Admin privileges required" });
    return;
  }
  next();
};
