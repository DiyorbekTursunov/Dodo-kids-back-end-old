import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get all sizes
export const getAllSizes = async () => {
  const sizes = await prisma.size.findMany({
    orderBy: { createdAt: "desc" },
  });
  return sizes;
};

// Get size by ID
export const getSizeById = async (id: string) => {
  const size = await prisma.size.findUnique({ where: { id } });
  return size;
};

// Create a size
export const createSize = async (name: string) => {
  const existing = await prisma.size.findUnique({ where: { name } });
  if (existing) {
    throw new Error("Size already exists");
  }

  const size = await prisma.size.create({
    data: {
      name,
    },
  });
  return size;
};

// Update a size
export const updateSize = async (id: string, name: string) => {
  const existing = await prisma.size.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Size not found");
  }
  const updated = await prisma.size.update({ where: { id }, data: { name } });
  return updated;
};

// Delete a size
export const deleteSize = async (id: string) => {
  const existing = await prisma.size.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Size not found");
  }
  await prisma.size.delete({ where: { id } });
  return { message: "Size deleted successfully" };
};
