import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const findDepartmentById = async (id: string) => {
  return prisma.department.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });
};

export const getAllDepartments = async () => {
  return prisma.department.findMany({
    select: {
      id: true,
      name: true,
    },
  });
};

export const departmentExists = async (id: string): Promise<boolean> => {
  const department = await findDepartmentById(id);
  return !!department;
};
