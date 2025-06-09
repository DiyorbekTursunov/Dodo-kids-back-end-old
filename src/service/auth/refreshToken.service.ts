// In-memory storage for development (use Redis or database in production)
const refreshTokenStore = new Set<string>();

export const storeRefreshToken = (token: string): void => {
  refreshTokenStore.add(token);
};

export const isValidRefreshToken = (token: string): boolean => {
  return refreshTokenStore.has(token);
};

export const revokeRefreshToken = (token: string): void => {
  refreshTokenStore.delete(token);
};

export const revokeAllRefreshTokens = (): void => {
  refreshTokenStore.clear();
};

export const getRefreshTokenCount = (): number => {
  return refreshTokenStore.size;
};

// services/userService.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const findUserByLogin = async (login: string) => {
  return prisma.user.findUnique({
    where: { login },
    select: {
      id: true,
      login: true,
      role: true,
      password: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      login: true,
      role: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
  });
};

export const createUser = async (userData: {
  login: string;
  password: string;
  role: "ADMIN" | "USER";
  departmentId: string;
  departmentName: string;
}) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  return prisma.user.create({
    data: {
      login: userData.login,
      password: hashedPassword,
      role: userData.role,
      employee: {
        create: {
          name: userData.departmentName,
          departmentId: userData.departmentId,
        },
      },
    },
    select: {
      id: true,
      login: true,
      role: true,
      employee: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
  });
};

export const validatePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

export const checkUserExists = async (login: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { login },
    select: { id: true },
  });
  return !!user;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};
