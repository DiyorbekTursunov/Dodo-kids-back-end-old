import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Type definitions for ProductPack filter parameters
type ProductPackFilterParams = {
  colorId?: string;
  sizeId?: string;
  departmentId?: string;
  model?: string;
  status?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  startDate?: string;
  endDate?: string;
};

/**
 * Get product packs with filtering options by color, size, department, status, and date range
 */
export const getFilteredProductPacks = async (req: Request, res: Response) => {
  try {
    const filters = extractProductPackFilterParams(req);

    // Create filter condition
    const where: any = {};

    // Filter by departmentId if provided
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    // Filter by product model if provided
    if (filters.model) {
      where.Product = {
        model: {
          contains: filters.model,
          mode: "insensitive" as const,
        },
      };
    }

    // Filter by related color if provided
    if (filters.colorId) {
      where.Product = {
        ...where.Product,
        color: {
          some: {
            id: filters.colorId,
          },
        },
      };
    }

    // Filter by related size if provided
    if (filters.sizeId) {
      where.Product = {
        ...where.Product,
        size: {
          some: {
            id: filters.sizeId,
          },
        },
      };
    }

    // Filter by createdAt date range if provided
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Get data with filters
    const productPacks = await prisma.productPack.findMany({
      where,
      orderBy: {
        [filters.sortBy]: filters.sortOrder,
      },
      include: {
        product: {
          include: {
            colors: true,
            sizes: true,
          },
        },
        processes: true,
      },
    });

    // Process status information for each product pack
    const processedProductPacks = productPacks.map((pack) => {
      // Find the latest status entry for this product pack
      const latestStatus =
        pack.processes.length > 0
          ? pack.processes.reduce((latest, current) =>
              new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest
            )
          : null;

      // Map status values as required
      let statusValue = "";
      if (latestStatus) {
        if (latestStatus.status === "Pending") {
          statusValue = "Pending";
        } else if (latestStatus.status === "Qabul qilingan") {
          statusValue = "Qabul qilingan";
        } else if ((latestStatus.sentCount ?? 0) < (latestStatus.acceptCount ?? 0)) {
          statusValue = "To'liq yuborilmagan";
        } else {
          statusValue = "Yuborilgan";
        }
      }

      return {
        ...pack,
        processedStatus: statusValue,
      };
    });

    // Filter by status if provided (exclude Pending status if not explicitly requested)
    const statusFilteredPacks = filters.status
      ? processedProductPacks.filter((pack) => pack.processedStatus === filters.status)
      : processedProductPacks.filter((pack) => pack.processedStatus !== "Pending");

    return res.status(200).json({
      data: statusFilteredPacks,
    });
  } catch (error) {
    console.error("Error fetching filtered product packs:", error);
    return res.status(500).json({
      error: "Failed to fetch product packs",
      details: (error as Error).message,
    });
  }
};

/**
 * Helper function to extract filter parameters from request
 */
function extractProductPackFilterParams(req: Request): ProductPackFilterParams {
  return {
    colorId: req.query.colorId as string || undefined,
    sizeId: req.query.sizeId as string || undefined,
    departmentId: req.query.departmentId as string || undefined,
    model: req.query.model as string || undefined,
    status: req.query.status as string || undefined,
    sortBy: (req.query.sortBy as string) || "createdAt",
    sortOrder: ((req.query.sortOrder as "asc" | "desc") || "desc"),
    startDate: req.query.startDate as string || undefined,
    endDate: req.query.endDate as string || undefined,
  };
}
