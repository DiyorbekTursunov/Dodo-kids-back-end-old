import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Input validation schema
const dateRangeSchema = z.object({
  startDate: z.string().date().optional(), // Validates YYYY-MM-DD
  endDate: z.string().date().optional(),   // Validates YYYY-MM-DD
});

// Dashboard Controller with date range filtering
export const getDashboardStatsByDateRange = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate input from query or body
    const input = {
      startDate: req.query.startDate || req.body.startDate,
      endDate: req.query.endDate || req.body.endDate,
    };
    const validatedInput = dateRangeSchema.parse(input);

    const { startDate, endDate } = validatedInput;

    console.log("Date inputs:", { startDate, endDate });

    // Parse dates
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;
    let dateFilter = {};
    let usedFallback = false;

    if (startDate) {
      parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);
      if (isNaN(parsedStartDate.getTime())) {
        throw new Error(`Invalid start date: ${startDate}`);
      }
    }

    if (endDate) {
      parsedEndDate = new Date(`${endDate}T23:59:59.999Z`);
      if (isNaN(parsedEndDate.getTime())) {
        throw new Error(`Invalid end date: ${endDate}`);
      }
    }

    // Construct date filter if at least one date is provided
    if (parsedStartDate || parsedEndDate) {
      dateFilter = {
        createdAt: {
          ...(parsedStartDate && { gte: parsedStartDate }),
          ...(parsedEndDate && { lte: parsedEndDate }),
        },
      };
    } else {
      console.log("No valid dates provided, using all data");
      usedFallback = true;
    }

    // Get total ProductPack count within date range
    const totalProductPacks = await prisma.productPack.count({
      where: dateFilter,
    });

    // Initialize stats
    const emptyStats = {
      sendedCount: 0,
      invalidCount: 0,
      acceptCount: 0,
      residueCount: 0,
    };
    let overallStats = { ...emptyStats };

    // Get ProductPacks within date range
    const productPacks = await prisma.productPack.findMany({
      where: dateFilter,
      orderBy: { createdAt: "desc" },
      include: {
        processes: {
          orderBy: { createdAt: "desc" },
          take: 1, // Only fetch the latest process
        },
      },
    });

    // Calculate overall stats
    productPacks.forEach((pack) => {
      if (pack.processes.length > 0) {
        const latestStatus = pack.processes[0];
        overallStats.sendedCount += latestStatus.sentCount ?? 0;
        overallStats.invalidCount += latestStatus.invalidCount ?? 0;
        overallStats.acceptCount += latestStatus.acceptCount ?? 0;
        overallStats.residueCount += latestStatus.residueCount ?? 0;
      }
    });

    // Get all departments
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });

    // Calculate stats by department
    const departmentStats = await Promise.all(
      departments.map(async (department) => {
        const productPacksInDepartment = await prisma.productPack.findMany({
          where: {
            departmentId: department.id,
            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
          },
          include: {
            processes: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });

        let totalCount = 0;
        let sendedCount = 0;
        let invalidCount = 0;
        let acceptCount = 0;
        let residueCount = 0;

        productPacksInDepartment.forEach((pack) => {
          totalCount += pack.totalCount;
          if (pack.processes.length > 0) {
            const latestStatus = pack.processes[0];
            sendedCount += latestStatus.sentCount ?? 0;
            invalidCount += latestStatus.invalidCount ?? 0;
            acceptCount += latestStatus.acceptCount ?? 0;
            residueCount += latestStatus.residueCount ?? 0;
          }
        });

        const processIsOver =
          productPacksInDepartment.length > 0 &&
          acceptCount > 0 &&
          sendedCount + invalidCount === acceptCount;

        return {
          id: department.id,
          name: department.name,
          department: department.name,
          totalCount,
          processIsOver,
          sendedCount,
          invalidCount,
          acceptCount,
          residueCount,
        };
      })
    );

    // Filter out departments with no activity
    const filteredDepartmentStats = departmentStats.filter(
      (stat) =>
        stat.totalCount > 0 ||
        stat.sendedCount > 0 ||
        stat.invalidCount > 0 ||
        stat.acceptCount > 0 ||
        stat.residueCount > 0
    );

    // Construct response
    const dashboardData = {
      totalProductPacks,
      dateRange: {
        startDate: parsedStartDate?.toISOString() ?? null,
        endDate: parsedEndDate?.toISOString() ?? null,
      },
      usedFallbackData: usedFallback,
      overallStats,
      departmentStats: filteredDepartmentStats,
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
