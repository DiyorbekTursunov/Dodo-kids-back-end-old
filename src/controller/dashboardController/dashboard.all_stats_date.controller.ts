import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dashboard Controller with date range filtering and NO fallback to all data for statistics
export const getDashboardStatsByDateRange = async (
  req: Request,
  res: Response
) => {
  try {
    // Get date information from both query and body
    const startDateInput = req.query.startDate || req.body.startDate;
    const endDateInput = req.query.endDate || req.body.endDate;

    console.log('Date inputs:', { startDateInput, endDateInput });

    // Validate and parse dates
    let dateFilter = {};
    let parsedStartDate: Date | undefined = undefined;
    let parsedEndDate: Date | undefined = undefined;
    let usingFallback = false;

    if (startDateInput && typeof startDateInput === 'string') {
      try {
        parsedStartDate = new Date(startDateInput);
        if (isNaN(parsedStartDate.getTime())) {
          console.error('Invalid start date format:', startDateInput);
          parsedStartDate = undefined;
        }
      } catch (e) {
        console.error('Error parsing start date:', e);
      }
    }

    if (endDateInput && typeof endDateInput === 'string') {
      try {
        parsedEndDate = new Date(endDateInput);
        if (isNaN(parsedEndDate.getTime())) {
          console.error('Invalid end date format:', endDateInput);
          parsedEndDate = undefined;
        } else {
          // Add one day to include the entire end date
          parsedEndDate.setHours(23, 59, 59, 999);
        }
      } catch (e) {
        console.error('Error parsing end date:', e);
      }
    }

    // Get total ProductPack count (not filtered by date)
    const totalProductPacks = await prisma.productPack.count();

    // Define empty stats for when no data is found
    const emptyStats = {
      sendedCount: 0,
      invalidCount: 0,
      acceptCount: 0,
      residueCount: 0
    };

    let productPacks = [];
    let overallStats = { ...emptyStats };

    // Only apply date filter if at least one date is valid
    if (parsedStartDate || parsedEndDate) {
      // Construct date filter for ProductPack
      dateFilter = {
        createdAt: {
          ...(parsedStartDate && { gte: parsedStartDate }),
          ...(parsedEndDate && { lte: parsedEndDate })
        }
      };

      // Get ProductPacks within date range
      productPacks = await prisma.productPack.findMany({
        where: dateFilter,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          processes: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (productPacks.length === 0) {
        console.log('No data in specified date range');
        // Keep overallStats as zeros
      } else {
        // Calculate overall stats from ProductPacks in the date range
        productPacks.forEach(pack => {
          if (pack.processes && pack.processes.length > 0) {
            const latestStatus = pack.processes[0]; // Already ordered by createdAt desc
            overallStats.sendedCount += latestStatus.sentCount ?? 0;
            overallStats.invalidCount += latestStatus.invalidCount ?? 0;
            overallStats.acceptCount += latestStatus.acceptCount ?? 0;
            overallStats.residueCount += latestStatus.residueCount ?? 0;
          }
        });
      }
    } else {
      // If dates are not valid, get all data
      console.log('Invalid date parameters, using all data');
      usingFallback = true;

      productPacks = await prisma.productPack.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          processes: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      // Calculate stats from all data when falling back
      productPacks.forEach(pack => {
        if (pack.processes && pack.processes.length > 0) {
          const latestStatus = pack.processes[0]; // Already ordered by createdAt desc
            overallStats.sendedCount += latestStatus.sentCount ?? 0;
            overallStats.invalidCount += latestStatus.invalidCount ?? 0;
            overallStats.acceptCount += latestStatus.acceptCount ?? 0;
            overallStats.residueCount += latestStatus.residueCount ?? 0;
        }
      });
    }

    // Get all departments
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Get stats aggregated by department
    const formattedProductPackStats = await Promise.all(
      departments.map(async (department) => {
        // Get ProductPacks associated with this department, applying date filter if applicable
        const productPacksInDepartment = await prisma.productPack.findMany({
          where: {
            departmentId: department.id,
            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {})
          },
          include: {
            processes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        // If no data for this department in the date range, return zeros
        if (productPacksInDepartment.length === 0) {
          return {
            id: department.id,
            name: department.name,
            department: department.name,
            totalCount: 0,
            protsessIsOver: false,
            sendedCount: 0,
            invalidCount: 0,
            acceptCount: 0,
            residueCount: 0,
          };
        }

        // Sum up totalCount for this department
        const totalCount = productPacksInDepartment.reduce(
          (sum, pack) => sum + pack.totalCount,
          0
        );

        // Calculate department stats from the latest status of each product pack
        let sendedCount = 0;
        let invalidCount = 0;
        let acceptCount = 0;
        let residueCount = 0;

        productPacksInDepartment.forEach(pack => {
          if (pack.processes && pack.processes.length > 0) {
            const latestStatus = pack.processes[0]; // Already ordered by createdAt desc
            overallStats.sendedCount += latestStatus.sentCount ?? 0;
            overallStats.invalidCount += latestStatus.invalidCount ?? 0;
            overallStats.acceptCount += latestStatus.acceptCount ?? 0;
            overallStats.residueCount += latestStatus.residueCount ?? 0;
          }
        });

        // Calculate if process is complete
        const protsessIsOver = productPacksInDepartment.length > 0 &&
          acceptCount > 0 &&
          sendedCount + invalidCount === acceptCount;

        return {
          id: department.id,
          name: department.name,
          department: department.name,
          totalCount,
          protsessIsOver,
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
      dateRange: {
        startDate: parsedStartDate
          ? parsedStartDate.toISOString()
          : "No start date specified",
        endDate: parsedEndDate
          ? parsedEndDate.toISOString()
          : "No end date specified",
      },
      usedFallbackData: usingFallback,
      overallStats,
      departmentStats: formattedProductPackStats,
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats with date range:", error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dashboard statistics for the specified date range",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
