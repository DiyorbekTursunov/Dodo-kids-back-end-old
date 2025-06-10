import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schema for query parameters
const filterSchema = z.object({
  colorId: z.string().uuid().optional(),
  sizeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  model: z.string().optional(),
  isOutsourced: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// Type definitions for ProductPack filter parameters
type ProductPackFilterParams = {
  colorId?: string;
  sizeId?: string;
  departmentId?: string;
  model?: string;
  isOutsourced?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
};

/**
 * Get product packs with filtering options by color, size, department, outsourced status, date range, and pagination
 */
export const getFilteredProductPacks = async (req: Request, res: Response) => {
  try {
    // Validate and extract filter parameters
    const filters = filterSchema.parse(req.query) as ProductPackFilterParams;

    // Calculate skip value for pagination
    const skip = (filters.page - 1) * filters.pageSize;

    // Create filter condition
    const where: any = {
      processIsOver: false, // Exclude completed product packs
    };

    // Filter by departmentId if provided
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    // Filter by product model if provided
    if (filters.model) {
      where.product = {
        model: {
          contains: filters.model,
          mode: "insensitive",
        },
      };
    }

    // Filter by related color if provided
    if (filters.colorId) {
      where.product = {
        ...where.product,
        colors: {
          some: {
            id: filters.colorId,
          },
        },
      };
    }

    // Filter by related size if provided
    if (filters.sizeId) {
      where.product = {
        ...where.product,
        sizes: {
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

    // Filter by isOutsourced if explicitly set to true
    if (filters.isOutsourced === true) {
      where.processes = {
        some: {
          isOutsourced: true,
        },
      };
    }

    // Fetch product packs with pagination and count
    const [productPacks, totalCount] = await Promise.all([
      prisma.productPack.findMany({
        where,
        skip,
        take: filters.pageSize,
        orderBy: {
          [filters.sortBy]: filters.sortOrder,
        },
        include: {
          product: {
            include: {
              colors: true,
              sizes: true,
              productGroupFiles: true,
            },
          },
          processes: true,
          department: true,
        },
      }),
      prisma.productPack.count({ where }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / filters.pageSize);

    return res.status(200).json({
      data: productPacks,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching filtered product packs:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid filter parameters",
        details: error.errors,
      });
    }
    return res.status(500).json({
      error: "Failed to fetch product packs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
