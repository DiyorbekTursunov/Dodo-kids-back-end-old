import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Input validation schema for pagination and departmentId
const querySchema = z.object({
  departmentId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// Get Sent Product Packs for a Department with Pagination
export const getAccesltenceProductPacks = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate query parameters and departmentId
    const { departmentId, page, pageSize } = querySchema.parse({
      departmentId: req.params.departmentId,
      ...req.query,
    });

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * pageSize;

    // Get product packs with latest status "QabulQilingan" and total count
    const [sentProductPacks, totalCount] = await Promise.all([
      prisma.productPack.findMany({
        where: {
          departmentId,
          processes: {
            some: {
              status: "QabulQilingan",
            },
          },
        },
        skip,
        take: pageSize,
        include: {
          product: {
            include: {
              colors: true,
              sizes: true,
            },
          },
          processes: {
            orderBy: {
              date: "desc",
            },
            where: {
              status: "QabulQilingan",
            },
          },
        },
      }),
      prisma.productPack.count({
        where: {
          departmentId,
          processes: {
            some: {
              status: "QabulQilingan",
            },
          },
        },
      }),
    ]);

    // Format the response
    const formattedPacks = sentProductPacks.map((pack) => ({
      ...pack,
      latestStatus: pack.processes[0] || null,
      status: undefined,
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      data: formattedPacks,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input parameters",
        details: err.errors,
      });
    }

    console.error("Error fetching sent product packs:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
