import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const departmentFlowMap: Record<string, string[]> = {
  bichuv: ["tasnif"],
  tasnif: ["pechat", "pechat_usluga"], // Updated to only include pechat and pechat_usluga
  pechat: ["vishivka", "vishivka_usluga"],
  pechat_usluga: ["vishivka", "vishivka_usluga"],
  vishivka: ["tikuv", "tikuv_usluga"],
  vishivka_usluga: ["tikuv", "tikuv_usluga"],
  tikuv: ["chistka"],
  tikuv_usluga: ["chistka"],
  chistka: ["kontrol"],
  kontrol: ["dazmol"],
  dazmol: ["upakovka"],
  upakovka: ["ombor"],
  ombor: [],
};

const normalizeDepartment = (name: string): string => {
  const map: Record<string, string> = {
    autsorspechat: "pechat",
    autsorstikuv: "tikuv",
    pechat_usluga: "pechat_usluga",
    vishivka_usluga: "vishivka_usluga",
    tikuv_usluga: "tikuv_usluga",
  };
  return map[name.toLowerCase()] || name.toLowerCase();
};

export const getNextDepartmentsService = async (departmentId: string) => {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new Error("Department not found");
  }

  const currentDeptName = department.name;
  const normalizedName = normalizeDepartment(currentDeptName);
  const nextNames = departmentFlowMap[normalizedName] || [];

  const resolvedDepartments = await prisma.department.findMany({
    where: {
      name: {
        in: nextNames,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return {
    currentDepartment: department.name,
    nextDepartments: resolvedDepartments,
  };
};
