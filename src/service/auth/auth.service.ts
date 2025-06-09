import {
  generateTokenPair,
  verifyRefreshToken,
  verifyAccessToken,
} from "./token.service";
import {
  storeRefreshToken,
  isValidRefreshToken,
  revokeRefreshToken,
} from "./refreshToken.service";
import {
  findUserByLogin,
  findUserById,
  createUser,
  validatePassword,
  checkUserExists,
} from "../../service/auth/user.service";
import { findDepartmentById } from "./department.service";
import { AuthResponse, RefreshResponse } from "../../types/auth/auth";

export const login = async (
  loginInput: string,
  password: string
): Promise<AuthResponse> => {
  // Find user
  const user = await findUserByLogin(loginInput);
  if (!user) {
    throw new Error("Invalid login or password");
  }

  // Validate password
  const isValidPassword = await validatePassword(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid login or password");
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user.id, user.role);

  // Store refresh token
  storeRefreshToken(refreshToken);

  return {
    message: "Login successful",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      employee: user.employee,
    },
  };
};

export const register = async (userData: {
  login: string;
  password: string;
  role: "ADMIN" | "USER";
  departmentId: string;
}): Promise<AuthResponse> => {
  // Check if user already exists
  const userExists = await checkUserExists(userData.login);
  if (userExists) {
    throw new Error("Login already taken");
  }

  // Validate department
  const department = await findDepartmentById(userData.departmentId);
  if (!department) {
    throw new Error("Invalid departmentId");
  }

  // Create user
  const newUser = await createUser({
    login: userData.login,
    password: userData.password,
    role: userData.role,
    departmentId: userData.departmentId,
    departmentName: department.name,
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(
    newUser.id,
    newUser.role
  );

  // Store refresh token
  storeRefreshToken(refreshToken);

  return {
    message: "Employee registered successfully",
    accessToken,
    refreshToken,
    user: {
      id: newUser.id,
      login: newUser.login,
      role: newUser.role,
      employee: newUser.employee,
    },
  };
};

export const refreshToken = async (
  refreshTokenInput: string
): Promise<RefreshResponse> => {
  // Validate refresh token exists in store
  if (!isValidRefreshToken(refreshTokenInput)) {
    throw new Error("Invalid refresh token");
  }

  // Verify token signature and expiry
  const decoded = verifyRefreshToken(refreshTokenInput);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  // Verify user still exists
  const user = await findUserById(decoded.userId);
  if (!user) {
    // Clean up invalid token
    revokeRefreshToken(refreshTokenInput);
    throw new Error("User not found");
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(user.id, user.role);

  return {
    message: "Token refreshed successfully",
    accessToken: newAccessToken,
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      employee: user.employee,
    },
  };
};

export const logout = async (refreshTokenInput?: string): Promise<void> => {
  if (refreshTokenInput) {
    revokeRefreshToken(refreshTokenInput);
  }
};

export const validateAccessToken = async (token: string) => {
  const decoded = verifyAccessToken(token);

  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }

  const user = await findUserById(decoded.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    login: user.login,
    role: user.role,
  };
};

// Import single function for better tree-shaking
import { generateAccessToken } from "./token.service";
