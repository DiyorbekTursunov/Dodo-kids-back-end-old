import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const searchSchema = z.object({
  query: z.string().optional().default(""),
  productId: z.string().uuid().optional(),
  departmentId: z.string().optional(),
  isOutsourced: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  status: z.enum(["Pending"]).optional(),
  processIsOver: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const searchProductsByModel = async (req: Request, res: Response) => {
  try {
    const {
      query,
      productId,
      departmentId,
      isOutsourced,
      status,
      processIsOver,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = searchSchema.parse(req.query);

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductPackWhereInput = {
      ...(processIsOver !== undefined ? { processIsOver } : {}),
      ...(productId ? { productId } : {}),
      ...(query
        ? {
            product: {
              model: { contains: query, mode: "insensitive" as Prisma.QueryMode },
            },
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(isOutsourced ? { processes: { some: { isOutsourced: true } } } : {}),
      ...(status === "Pending" ? { processes: { some: { status: "Pending" } } } : {}),
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
            orderBy: { updatedAt: "desc" },
          },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.productPack.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const formattedPacks = productPacks.map((pack) => ({
      ...pack,
      latestStatus: pack.processes[0] || null,
      processes: undefined,
    }));

    if (productPacks.length === 0) {
      return res.status(200).json({
        data: [],
        pagination: { page, pageSize, totalCount, totalPages },
        message:
          "No product packs found. Verify that search terms (query, productId, departmentId, status=Pending, processIsOver) match existing data. Ensure ProductProcess records with status 'Pending' exist if status is specified. Check if 'query' matches product model names (e.g., 'Futbolka').",
      });
    }

    return res.status(200).json({
      data: formattedPacks,
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
