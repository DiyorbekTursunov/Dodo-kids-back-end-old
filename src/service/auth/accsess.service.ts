import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: true, // Include employee information
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    login: user.login,
    role: user.role,
    employee: user.employee,
  };
};
