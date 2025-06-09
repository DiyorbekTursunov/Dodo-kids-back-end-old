import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to throw errors with status codes
const throwError = (message: string, statusCode: number) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  throw error;
};

export const createDepartmentService = async (name: string) => {
  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) throwError("Department already exists", 409);

  return prisma.department.create({ data: { name } });
};

export const getDepartmentsService = () => {
  return prisma.department.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getDepartmentByIdService = async (id: string) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throwError("Department not found", 404);
  return department;
};

export const updateDepartmentService = async (id: string, name: string) => {
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throwError("Department not found", 404);

  const nameExists = await prisma.department.findUnique({ where: { name } });
  if (nameExists && nameExists.id !== id)
    throwError("Department with this name already exists", 409);

  return prisma.department.update({ where: { id }, data: { name } });
};

export const deleteDepartmentService = async (id: string) => {
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throwError("Department not found", 404);

  return prisma.department.delete({ where: { id } });
};
