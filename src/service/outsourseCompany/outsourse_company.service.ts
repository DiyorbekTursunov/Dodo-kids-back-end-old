import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const throwError = (message: string, statusCode: number) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  throw error;
};

export const createOutsourseCompanyService = async (name: string) => {
//   const existing = await prisma.outsourseCompany.findUnique({ where: { name } });
//   if (existing) throwError("Outsourse Company already exists", 409);

  return prisma.outsourseCompany.create({ data: { name } });
};

export const getOutsourseCompaniesService = () => {
  return prisma.outsourseCompany.findMany();
};

export const getOutsourseCompanyByIdService = async (id: string) => {
  const company = await prisma.outsourseCompany.findUnique({ where: { id } });
  if (!company) throwError("Outsourse Company not found", 404);
  return company;
};

export const updateOutsourseCompanyService = async (id: string, name: string) => {
  const existing = await prisma.outsourseCompany.findUnique({ where: { id } });
  if (!existing) throwError("Outsourse Company not found", 404);

  const nameExists = await prisma.outsourseCompany.findFirst({ where: { name } });
  if (nameExists && nameExists.id !== id)
    throwError("Company with this name already exists", 409);

  return prisma.outsourseCompany.update({ where: { id }, data: { name } });
};

export const deleteOutsourseCompanyService = async (id: string) => {
  const existing = await prisma.outsourseCompany.findUnique({ where: { id } });
  if (!existing) throwError("Outsourse Company not found", 404);

  return prisma.outsourseCompany.delete({ where: { id } });
};
