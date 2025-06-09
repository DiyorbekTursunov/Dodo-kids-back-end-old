import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dashboard Controller
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get all ProductPack count
    const totalProductPacks = await prisma.productPack.count();

    // Get overall stats
    const overallStats = await prisma.productProcess.aggregate({
      _sum: {
        sentCount: true,
        invalidCount: true,
        acceptCount: true,
      },
    });

    // Get sum of all totalCount from ProductPacks for overall count
    const overallTotalCount = await prisma.productPack.aggregate({
      _sum: {
        totalCount: true,
      },
    });

    // Calculate overall residueCount using the new formula
    const overallSendedCount = overallStats._sum.sentCount || 0;
    const overallInvalidCount = overallStats._sum.invalidCount || 0;
    const overallAcceptCount = overallStats._sum.acceptCount || 0;
    const overallResidueCount = overallAcceptCount - (overallSendedCount + overallInvalidCount);

    // Get all unique departments from ProductPacks
    const uniqueDepartments = await prisma.productPack.findMany({
      distinct: ["departmentId"],
      select: {
        department: true,
      },
    });

    // Get stats aggregated by department
    const formattedProductPackStats = await Promise.all(
      uniqueDepartments.map(async ({ department }) => {
        // Get all ProductPacks for this department
        const productPacksInDepartment = await prisma.productPack.findMany({
          where: {
            department,
          },
          select: {
            id: true,
            totalCount: true,
          },
        });

        // Sum up totalCount for all products in this department
        const totalCount = productPacksInDepartment.reduce(
          (sum, pack) => sum + pack.totalCount,
          0
        );

        // Get the IDs of all ProductPacks in this department
        const productPackIds = productPacksInDepartment.map((pack) => pack.id);

        // Aggregate stats for all ProductPacks in this department
        const processStats = await prisma.productProcess.aggregate({
          where: {
            productPackId: {
              in: productPackIds,
            },
          },
          _sum: {
            sentCount: true,
            invalidCount: true,
            acceptCount: true,
          },
        });

        // Calculate residueCount for this department using the new formula
        const sendedCount = processStats._sum.sentCount || 0;
        const invalidCount = processStats._sum.invalidCount || 0;
        const acceptCount = processStats._sum.acceptCount || 0;

        // New formula: residueCount = acceptCount - (sendedCount + invalidCount)
        const residueCount = acceptCount - (sendedCount + invalidCount);

        return {
          id: department, // Using department as the ID for grouping
          name: department, // Using department name as the display name
          department,
          totalCount,
          // Process is over when acceptCount equals the sum of sendedCount and invalidCount
          protsessIsOver: acceptCount === (sendedCount + invalidCount),
          sendedCount,
          invalidCount,
          acceptCount,
          residueCount,
        };
      })
    );

    // Construct the response
    const dashboardData = {
      totalProductPacks,
      overallStats: {
        sendedCount: overallStats._sum.sentCount || 0,
        invalidCount: overallStats._sum.invalidCount || 0,
        acceptCount: overallStats._sum.acceptCount || 0,
        residueCount: overallResidueCount,
      },
      productPackStats: formattedProductPackStats,
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

interface DateRangeBody {
  startDate?: string;
  endDate?: string;
}

interface DateFilter {
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}
