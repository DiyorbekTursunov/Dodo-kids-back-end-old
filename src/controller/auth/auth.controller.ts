import { NextFunction, Request, Response } from "express";
import * as authService from "../../service/auth/auth.service";

import { getUserById } from "../../service/auth/accsess.service";

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { login, password } = req.body;

  if (!login || !password) {
    res.status(400).json({ error: "Login and password are required" });
  }

  try {
    const result = await authService.login(login, password);
    res.status(200).json(result);
  } catch (error) {
    console.error("Login error:", error);

    if (
      error instanceof Error &&
      error.message === "Invalid login or password"
    ) {
      res.status(401).json({ error: error.message });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { login, password, role, departmentId } = req.body;

  if (!login || !password || !role || !departmentId) {
    res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await authService.register({
      login,
      password,
      role,
      departmentId,
    });
    res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof Error) {
      if (error.message === "Login already taken") {
        res.status(409).json({ error: error.message });
      }
      if (error.message === "Invalid departmentId") {
        res.status(404).json({ error: error.message });
      }
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json(result);
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

export const logoutUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  try {
    await authService.logout(refreshToken);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user; // Now properly typed thanks to your middleware
    if (!user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const userInfo = await getUserById(user.id);

    res.status(200).json({
      message: "User information retrieved successfully",
      user: {
        id: userInfo.id,
        login: userInfo.login,
        role: userInfo.role,
        employee: userInfo.employee,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
