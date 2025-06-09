import jwt from "jsonwebtoken";
import { TokenPayload } from "../../types/auth/auth";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_default_secret";
const ACCESS_TOKEN_EXPIRY =
    process.env.NODE_ENV === "production" ? "15m" : "30d";
const REFRESH_TOKEN_EXPIRY = "90d";

if (
  JWT_SECRET === "default_secret" ||
  JWT_REFRESH_SECRET === "refresh_default_secret"
) {
  console.warn(
    "Warning: Using default JWT secrets. Please set secure JWT_SECRET and JWT_REFRESH_SECRET in your environment variables."
  );
}

export const generateAccessToken = (
  userId: string,
  role: "ADMIN" | "USER"
): string => {
  return jwt.sign(
    { userId, role, type: "access" } as TokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = (
  userId: string,
  role: "ADMIN" | "USER"
): string => {
  return jwt.sign(
    { userId, role, type: "refresh" } as TokenPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

export const generateTokenPair = (userId: string, role: "ADMIN" | "USER") => {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId, role),
  };
};
