import { Request, Response } from "express";
import { PrismaClient, ProcessStatus } from "@prisma/client";

const prisma = new PrismaClient();

const departmentOrderMap: Record<string, { logicalId: number; allowedNext: string[] }> = {
  bichuv: { logicalId: 1, allowedNext: ["tasnif"] },
  tasnif: { logicalId: 2, allowedNext: ["pechat", "pechatusluga"] },
  pechat: { logicalId: 3, allowedNext: ["vishivka", "vishivkausluga"] },
  pechatusluga: { logicalId: 3, allowedNext: ["vishivka", "vishivkausluga"] },
  vishivka: { logicalId: 4, allowedNext: ["tikuv", "tikuvusluga"] },
  vishivkausluga: { logicalId: 4, allowedNext: ["tikuv", "tikuvusluga"] },
  tikuv: { logicalId: 5, allowedNext: ["chistka"] },
  tikuvusluga: { logicalId: 5, allowedNext: ["chistka"] },
  chistka: { logicalId: 6, allowedNext: ["kontrol"] },
  kontrol: { logicalId: 7, allowedNext: ["dazmol"] },
  dazmol: { logicalId: 8, allowedNext: ["upakovka"] },
  upakovka: { logicalId: 9, allowedNext: ["ombor"] },
  ombor: { logicalId: 10, allowedNext: [] },
};

const normalizeDepartment = (name: string): string => {
  const map: Record<string, string> = {
    autsorspechat: "pechat",
    autsorstikuv: "tikuv",
    pechatusluga: "pechatusluga",
    vishivkausluga: "vishivkausluga",
    tikuvusluga: "tikuvusluga",
  };
  return map[name.toLowerCase()] || name.toLowerCase();
};

// Interfaces aligned with Prisma schema
interface Process {
  id: string;
  status: ProcessStatus;
  acceptCount: number | null;
  sentCount: number | null;
  invalidCount: number | null;
  residueCount: number | null;
  invalidReason: string | null;
  department: { id: string; name: string };
}

interface ProductFile {
  id: string;
  file: {
    id: string;
    filename: string;
    path: string;
  };
}

interface Status {
  id: string;
  status: ProcessStatus;
  date: Date;
  processIsOver: boolean;
  acceptCount: number | null;
  sentCount: number | null;
  invalidCount: number | null;
  residueCount: number | null;
  invalidReason: string | null;
  department: { id: string; name: string };
  outsourseCompany: { id: string; name: string } | null;
  isOutsourced: boolean;
}

interface Product {
  id: string;
  parentId: string | null;
  processIsOver: boolean;
  departmentId: string;
  department: { id: string; name: string };
  totalCount: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    model: string;
    productGroupFiles: ProductFile[];
  };
  processes: Process[];
  statuses: Status[];
}

interface TransformedProcess {
  department: { id: string; name: string };
  acceptCount: number | null;
  sentCount: number | null;
  invalidCount: number | null;
  residueCount: number | null;
  status: ProcessStatus;
}

interface TransformedProductFile {
  id: string;
  file: {
    id: string;
    filename: string;
    path: string;
  };
}

interface TransformedProductData {
  id: string;
  model: string;
  processes: TransformedProcess[];
  productGroupFiles: TransformedProductFile[];
}

interface TransformedStatus {
  id: string;
  status: ProcessStatus;
  date: string;
  processIsOver: boolean;
  acceptCount: number | null;
  sentCount: number | null;
  invalidCount: number | null;
  residueCount: number | null;
  invalidReason: string | null;
  department: { id: string; name: string };
  outsourseName: string | null;
  isOutsourced: boolean;
}

interface TransformedProduct {
  id: string;
  name: string | null;
  parentId: string | null;
  processIsOver: boolean;
  departmentId: string;
  department: string;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  product: TransformedProductData;
  statuses: TransformedStatus[];
  logicalId: number;
}

// Transformation function
const transformProduct = (product: Product): TransformedProduct => {
  const normalizedDept = normalizeDepartment(product.department.name);
  const logicalId = departmentOrderMap[normalizedDept]?.logicalId || 0;

  return {
    id: product.id,
    name: product.product.model, // Added 'name' property
    parentId: product.parentId,
    processIsOver: product.processIsOver,
    departmentId: product.departmentId,
    department: product.department.name,
    totalCount: product.totalCount,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    product: {
      id: product.product.id,
      model: product.product.model,
      processes: product.processes.map((process) => ({
        department: { id: process.department.id, name: process.department.name },
        acceptCount: process.acceptCount,
        sentCount: process.sentCount,
        invalidCount: process.invalidCount,
        residueCount: process.residueCount,
        status: process.status,
      })),
      productGroupFiles: product.product.productGroupFiles.map((file) => ({
        id: file.id,
        file: {
          id: file.file.id,
          filename: file.file.filename,
          path: file.file.path,
        },
      })),
    },
    statuses: product.statuses.map((status) => ({
      id: status.id,
      status: status.status,
      date: status.date.toISOString(),
      processIsOver: status.processIsOver,
      acceptCount: status.acceptCount,
      sentCount: status.sentCount,
      invalidCount: status.invalidCount,
      residueCount: status.residueCount,
      invalidReason: status.invalidReason,
      department: { id: status.department.id, name: status.department.name },
      outsourseName: status.outsourseCompany?.name || null,
      isOutsourced: status.isOutsourced,
    })),
    logicalId,
  };
};

export const getConsolidatedCaseTrackerStatus = async (
  req: Request,
  res: Response
) => {
  try {
    // Fetch ProductPacks with necessary relations
    const productPacks = await prisma.productPack.findMany({
      include: {
        department: true,
        processes: {
          include: {
            department: true,
            OutsourseCompany: true,
          },
          orderBy: { date: "desc" },
        },
        product: {
          include: {
            productGroupFiles: {
              include: { file: true },
            },
          },
        },
      },
    });

    // Validate and cast status to ProcessStatus
    const isValidProcessStatus = (status: string): status is ProcessStatus => {
      return Object.values(ProcessStatus).includes(status as ProcessStatus);
    };

    // Helper to map ProductPack to Product interface
    const mapProductPackToProduct = (pack: typeof productPacks[number]): Product => {
      return {
        id: pack.id,
        parentId: pack.parentId,
        processIsOver: pack.processIsOver,
        departmentId: pack.departmentId,
        department: pack.department,
        totalCount: pack.totalCount,
        createdAt: pack.createdAt,
        updatedAt: pack.updatedAt,
        product: {
          id: pack.product.id,
          model: pack.product.model,
          productGroupFiles: pack.product.productGroupFiles,
        },
        processes: pack.processes.map((process) => {
          if (!isValidProcessStatus(process.status)) {
            console.warn(`Invalid status "${process.status}" for process ${process.id}, defaulting to ProcessStatus.Default`);
          }
          return {
            id: process.id,
            status: isValidProcessStatus(process.status) ? process.status : ProcessStatus.QabulQilingan,
            acceptCount: process.acceptCount,
            sentCount: process.sentCount,
            invalidCount: process.invalidCount,
            residueCount: process.residueCount,
            invalidReason: process.invalidReason,
            department: process.department,
          };
        }),
        statuses: pack.processes.map((process) => ({
          id: process.id,
          status: isValidProcessStatus(process.status) ? process.status : ProcessStatus.QabulQilingan,
          date: process.date,
          processIsOver: process.processIsOver,
          acceptCount: process.acceptCount,
          sentCount: process.sentCount,
          invalidCount: process.invalidCount,
          residueCount: process.residueCount,
          invalidReason: process.invalidReason,
          department: process.department,
          outsourseCompany: process.OutsourseCompany ?? null,
          isOutsourced: process.isOutsourced,
        })),
      };
    };

    // Transform and format packs
    const formattedPacks: TransformedProduct[] = productPacks.map((pack) =>
      transformProduct(mapProductPackToProduct(pack))
    );

    // Consolidate packs by parentId and department
    const consolidatedMap: Map<string, TransformedProduct> = new Map();

    formattedPacks.forEach((pack) => {
      const key = `${pack.parentId || pack.id}-${normalizeDepartment(pack.department)}`;
      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, pack);
      } else {
        const existing = consolidatedMap.get(key)!;
        const latestStatusDate = pack.statuses[0]?.date || "0";
        const existingStatusDate = existing.statuses[0]?.date || "0";
        if (new Date(latestStatusDate) > new Date(existingStatusDate)) {
          consolidatedMap.set(key, pack);
        }
      }
    });

    // Convert to array, sort by logicalId
    const consolidatedPacksArray: TransformedProduct[] = Array.from(
      consolidatedMap.values()
    ).sort((a, b) => a.logicalId - b.logicalId);

    // Group by parentId
    const groupedByParentId: { [parentId: string]: TransformedProduct[] } = {};

    consolidatedPacksArray.forEach((pack) => {
      const parentId = pack.parentId || pack.id;
      if (!groupedByParentId[parentId]) {
        groupedByParentId[parentId] = [];
      }
      groupedByParentId[parentId].push(pack);
    });

    // Format response
    const responseData = Object.entries(groupedByParentId).map(([parentId, data]) => ({
      parentId,
      data,
    }));

    return res.status(200).json({
      success: true,
      count: responseData.length,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching consolidated status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consolidated status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
