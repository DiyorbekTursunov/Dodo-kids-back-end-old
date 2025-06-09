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
    const stats = await prisma.productProtsess.aggregate({
      where: {
        productpackId: id,
      },
      _sum: {
        sendedCount: true,
        invalidCount: true,
        residueCount: true,
        acceptCount: true,
      },
    });

    // Get individual process records for this ProductPack
    const processes = await prisma.productProtsess.findMany({
      where: {
        productpackId: id,
      },
      select: {
        id: true,
        date: true,
        status: true,
        sendedCount: true,
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
        name: true,
        department: true,
        totalCount: true,
        protsessIsOver: true,
        Product: {
          select: {
            model: true,
            color: {
              select: {
                name: true,
              },
            },
            size: {
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
          sendedCount: stats._sum.sendedCount || 0,
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
