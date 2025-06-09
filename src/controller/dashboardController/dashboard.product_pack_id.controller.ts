import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get detailed stats for a specific ProductPack
export const getProductPackStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the ProductPack exists
    const productPackExists = await prisma.productPack.findUnique({
      where: { id },
    });

    if (!productPackExists) {
      return res.status(404).json({
        success: false,
        message: "ProductPack not found",
      });
    }

    // Get aggregated stats for this ProductPack
    const stats = await prisma.productProcess.aggregate({
      where: {
        productPackId: id,
      },
      _sum: {
        sentCount: true,
        invalidCount: true,
        residueCount: true,
        acceptCount: true,
      },
    });

    // Get individual process records for this ProductPack
    const processes = await prisma.productProcess.findMany({
      where: {
        productPackId: id,
      },
      select: {
        id: true,
        date: true,
        status: true,
        sentCount: true,
        invalidCount: true,
        residueCount: true,
        acceptCount: true,
        invalidReason: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get product details
    const productDetails = await prisma.productPack.findUnique({
      where: { id },
      select: {
        department: true,
        totalCount: true,
        processIsOver: true,
        product: {
          select: {
            model: true,
            colors: {
              select: {
                name: true,
              },
            },
            sizes: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        details: productDetails,
        stats: {
          sentCount: stats._sum.sentCount || 0,
          invalidCount: stats._sum.invalidCount || 0,
          residueCount: stats._sum.residueCount || 0,
          acceptCount: stats._sum.acceptCount || 0,
        },
        processes,
      },
    });
  } catch (error) {
    console.error("Error fetching ProductPack stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ProductPack statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
