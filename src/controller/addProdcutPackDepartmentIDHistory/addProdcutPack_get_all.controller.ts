import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Input validation schema for departmentId (path parameter)
const departmentIdSchema = z.object({
  departmentId: z.string().uuid(),
});

// Input validation schema for pagination (query parameters)
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// Get all Product Packs by departmentId with pagination and filtering (history)
export const getAllProductPacksByIdHistory = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate departmentId from path parameters
    const { departmentId } = departmentIdSchema.parse(req.params);

    // Validate pagination parameters from query
    const { page, pageSize } = paginationSchema.parse(req.query);

    // Calculate skip value for pagination
    const skip = (page - 1) * pageSize;

    // Define the where clause for filtering
    const whereClause = {
      departmentId,
      processIsOver: true,
    };

    // Fetch product packs with pagination and filtering
    const [productPacks, totalCount] = await Promise.all([
      prisma.productPack.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        include: {
          product: {
            include: {
              productGroupFiles: {
                include: {
                  file: true,
                },
              },
              colors: true,
              sizes: true,
            },
          },
          processes: {
            orderBy: {
              date: "desc", // Ensure the latest process comes first
            },
          },
          department: true,
        },
      }),
      prisma.productPack.count({
        where: whereClause,
      }),
    ]);

    // Format the response to include latestStatus
    const formattedPacks = productPacks.map((pack) => ({
      ...pack,
      latestStatus: pack.processes[0] || null, // Latest process or null if none
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Send response
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
        error: "Invalid parameters",
        details: err.errors,
      });
    }

    console.error("Error fetching Product Packs:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
