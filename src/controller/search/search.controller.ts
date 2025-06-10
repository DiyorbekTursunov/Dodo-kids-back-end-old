import { Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Validation schema for getAllProductPacksById
const getAllProductPacksSchema = z.object({
  departmentId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// Get all Product Packs by departmentId with pagination and filtering
export const getAllProductPacksById = async (req: Request, res: Response) => {
  try {
    const { departmentId, page, pageSize } = getAllProductPacksSchema.parse({
      ...req.params,
      ...req.query,
    });

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductPackWhereInput = {
      departmentId,
      processIsOver: false,
    };

    const [productPacks, totalCount] = await Promise.all([
      prisma.productPack.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          product: {
            select: {
              id: true,
              model: true,
              colors: { select: { id: true, name: true } },
              sizes: { select: { id: true, name: true } },
              productGroupFiles: { select: { id: true, fileId: true } },
            },
          },
          processes: {
            select: {
              id: true,
              status: true,
              isOutsourced: true,
              acceptCount: true,
              sentCount: true,
              invalidCount: true,
              residueCount: true,
              updatedAt: true,
            },
          },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.productPack.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return res.status(200).json({
      data: productPacks,
      pagination: { page, pageSize, totalCount, totalPages },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid parameters",
        details: err.errors,
      });
    }
    console.error("Error fetching Product Packs:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};

// Validation schema for acceptProductPack
const acceptProductPackSchema = z.object({
  productPackId: z.string().uuid(),
  invalidCount: z.coerce.number().int().min(0).default(0),
  invalidReason: z.string().optional().default(""),
  employeeId: z.string().uuid(),
});

// Accept a product pack that was sent from another department
export const acceptProductPack = async (req: Request, res: Response) => {
  try {
    const { productPackId, invalidCount, invalidReason, employeeId } =
      acceptProductPackSchema.parse(req.body);

    const productPack = await prisma.productPack.findUnique({
      where: { id: productPackId },
      include: {
        processes: true,
        product: { select: { id: true, model: true } },
      },
    });

    if (!productPack) {
      return res.status(404).json({ error: "Product pack not found" });
    }

    const pendingStatus = productPack.processes.find(
      (process) => process.status === "Pending"
    );

    if (!pendingStatus) {
      return res
        .status(400)
        .json({ error: "Product pack does not have a pending status" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { id: true, name: true } } },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const isQadoqlashDepartment =
      employee.department.name.toLowerCase() === "ombor" ||
      (productPack.departmentName?.toLowerCase() === "ombor");

    const totalCount = productPack.totalCount;
    if (invalidCount > totalCount) {
      return res.status(400).json({
        error: "Invalid count cannot exceed total count",
        total: totalCount,
      });
    }

    const acceptCount = totalCount - invalidCount;

    const result = await prisma.$transaction(async (prismaClient) => {
      await prismaClient.productProcess.delete({
        where: { id: pendingStatus.id },
      });

      const newStatus = await prismaClient.productProcess.create({
        data: {
          processIsOver: isQadoqlashDepartment,
          status: "QabulQilingan",
          departmentId: productPack.departmentId,
          productPackId,
          employeeId,
          acceptCount,
          sentCount: 0,
          residueCount: 0,
          invalidCount,
          invalidReason,
        },
        select: {
          id: true,
          status: true,
          isOutsourced: true,
          acceptCount: true,
          sentCount: true,
          invalidCount: true,
          residueCount: true,
          updatedAt: true,
        },
      });

      await prismaClient.productPack.update({
        where: { id: productPackId },
        data: { processIsOver: isQadoqlashDepartment },
      });

      return {
        newStatus: status,
        pendingStatusId: pendingStatus.id,
        isComplete: isQadoqlashDepartment,
      };
    });

    return res.status(200).json({
      message: `Successfully accepted ${acceptCount} items${
        invalidCount > 0 ? ` and marked ${invalidCount} as invalid` : ""
      }${
        result.isComplete
          ? ". Process completed as this is the final ombor department."
          : ""
      }`,
      deletedPendingStatus: result.pendingStatusId,
      newStatus: result.newStatus,
      isComplete: result.isComplete,
    });
  } catch (err) {
    console.error("Error accepting product pack:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request body",
        details: err.errors,
      });
    }
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// Validation schema for searchProductsByModel
const searchSchema = z.object({
  query: z.string().optional().default(""), // Changed from productName to query
  colorName: z.string().optional(),
  sizeName: z.string().optional(),
  departmentId: z.string().optional(), // Allow non-UUID strings
  isOutsourced: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Search product packs by product model, color, size, and other filters
export const searchProductsByModel = async (req: Request, res: Response) => {
  try {
    const {
      query,
      colorName,
      sizeName,
      departmentId,
      isOutsourced,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = searchSchema.parse(req.query);

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductPackWhereInput = {
      processIsOver: false,
      product: {
        model: {
          contains: query,
          mode: "insensitive" as Prisma.QueryMode,
        },
        ...(colorName
          ? { colors: { some: { name: { contains: colorName, mode: "insensitive" } } } }
          : {}),
        ...(sizeName
          ? { sizes: { some: { name: { contains: sizeName, mode: "insensitive" } } } }
          : {}),
      },
      ...(departmentId ? { departmentId } : {}),
      ...(isOutsourced === true ? { processes: { some: { isOutsourced: true } } } : {}),
    };

    const [productPacks, totalCount] = await Promise.all([
      prisma.productPack.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          product: {
            select: {
              id: true,
              model: true,
              colors: { select: { id: true, name: true } },
              sizes: { select: { id: true, name: true } },
              productGroupFiles: { select: { id: true, fileId: true } },
            },
          },
          processes: {
            select: {
              id: true,
              status: true,
              isOutsourced: true,
              acceptCount: true,
              sentCount: true,
              invalidCount: true,
              residueCount: true,
              updatedAt: true,
            },
          },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.productPack.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (productPacks.length === 0) {
      return res.status(200).json({
        data: [],
        pagination: { page, pageSize, totalCount, totalPages },
        message:
          "No product packs found. Check if the search terms (query, colorName, sizeName, departmentId) or filters match existing data.",
      });
    }

    return res.status(200).json({
      data: productPacks,
      pagination: { page, pageSize, totalCount, totalPages },
    });
  } catch (err) {
    console.error("Error searching product packs:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: err.errors,
      });
    }
    return res.status(500).json({
      error: "Failed to search product packs",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};

// Validation schema for searchProducts
const searchProductsSchema = z.object({
  name: z.string().optional().default(""),
  colorName: z.string().optional(),
  sizeName: z.string().optional(),
  departmentId: z.string().optional(),
  isOutsourced: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Search products by model, color, size, and other filters
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const {
      name,
      colorName,
      sizeName,
      departmentId,
      isOutsourced,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = searchProductsSchema.parse(req.query);

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      model: {
        contains: name,
        mode: "insensitive" as Prisma.QueryMode,
      },
      ...(colorName
        ? { colors: { some: { name: { contains: colorName, mode: "insensitive" } } } }
        : {}),
      ...(sizeName
        ? { sizes: { some: { name: { contains: sizeName, mode: "insensitive" } } } }
        : {}),
      ...(departmentId || isOutsourced
        ? {
            productPacks: {
              some: {
                ...(departmentId ? { departmentId } : {}),
                ...(isOutsourced === true ? { processes: { some: { isOutsourced: true } } } : {}),
              },
            },
          }
        : {}),
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          colors: { select: { id: true, name: true } },
          sizes: { select: { id: true, name: true } },
          productGroupFiles: { select: { id: true, fileId: true } },
          productPacks: {
            select: {
              id: true,
              departmentId: true,
              totalCount: true,
              processIsOver: true,
              createdAt: true,
              department: { select: { id: true, name: true } },
              processes: {
                select: {
                  id: true,
                  status: true,
                  isOutsourced: true,
                  acceptCount: true,
                  sentCount: true,
                  invalidCount: true,
                  residueCount: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (products.length === 0) {
      return res.status(200).json({
        data: [],
        pagination: { page, pageSize, totalCount, totalPages },
        message:
          "No products found. Check if the search terms (name, colorName, sizeName, departmentId) or filters match existing data.",
      });
    }

    return res.status(200).json({
      data: products,
      pagination: { page, pageSize, totalCount, totalPages },
    });
  } catch (err) {
    console.error("Error searching products:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: err.errors,
      });
    }
    return res.status(500).json({
      error: "Failed to search products",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
