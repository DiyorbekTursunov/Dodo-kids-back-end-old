import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

//
const throwError = (message: string, statusCode: number) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  throw error;
};

export const createColorService = async (name: string) => {
  const existing = await prisma.color.findUnique({ where: { name } });
  if (existing) throwError("Color already exists", 409);

  return prisma.color.create({
    data: {
      name,
    },
  });
};

export const getColorsService = () => {
  return prisma.color.findMany();
};

export const getColorByIdService = async (id: string) => {
  const color = await prisma.color.findUnique({ where: { id } });
  if (!color) throwError("Color not found", 404);
  return color;
};

export const updateColorService = async (id: string, name: string) => {
  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) throwError("Color not found", 404);

  const nameExists = await prisma.color.findUnique({ where: { name } });
  if (nameExists && nameExists.id !== id)
    throwError("Color with this name already exists", 409);

  return prisma.color.update({ where: { id }, data: { name } });
};

export const deleteColorService = async (id: string) => {
  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) throwError("Color not found", 404);

  return prisma.color.delete({ where: { id } });
};
