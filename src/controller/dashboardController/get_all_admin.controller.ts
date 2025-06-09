import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Gets counts for all models in the database
 */
export const getAllModelCounts = async (req: Request, res: Response) => {
  try {
    // Get counts for all models
    const [
      colorCount,
      sizeCount,
      departmentCount,
      employeeCount,
      userCount,
      productPackCount,
      productCount,
      productProtsessCount,
      // Add additional model counts here as needed
    ] = await Promise.all([
      prisma.color.count(),
      prisma.size.count(),
      prisma.department.count(),
      prisma.employee.count(),
      prisma.user.count(),
      prisma.productPack.count(),
      prisma.product.count(),
      prisma.productProtsess.count(),
      // Add additional model counts here as needed
    ]);

    // Get user count by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    // Format user role counts
    const userRoleCounts = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);

    // Get top colors by product count
    const topColors = await prisma.color.findMany({
      include: {
        _count: {
          select: { Product: true },
        },
      },
      orderBy: {
        Product: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Get top sizes by product count
    const topSizes = await prisma.size.findMany({
      include: {
        _count: {
          select: { Product: true },
        },
      },
      orderBy: {
        Product: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Get department stats with employee and process counts
    const departmentStats = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            Employee: true,
            ProductProtsess: true,
          },
        },
      },
    });

    // Calculate process completion percentage for each department
    const departmentProcessStats = await Promise.all(
      departmentStats.map(async (dept) => {
        const totalProcesses = await prisma.productProtsess.count({
          where: { departmentId: dept.id },
        });

        const completedProcesses = await prisma.productProtsess.count({
          where: {
            departmentId: dept.id,
            protsessIsOver: true,
          },
        });

        const completionPercentage = totalProcesses > 0
          ? Math.round((completedProcesses / totalProcesses) * 100)
          : 0;

        return {
          id: dept.id,
          name: dept.name,
          employeeCount: dept._count.Employee,
          processCount: dept._count.ProductProtsess,
          completedProcesses,
          completionPercentage,
        };
      })
    );

    // Get product stats by model (fixed the error)
    const productColorSizeDistribution = await prisma.product.groupBy({
      by: ['model'],
      _count: true,
      orderBy: {
        _count: {
          model: 'desc',
        },
      },
      take: 10,
    });

    // Format the response
    const modelCounts = {
      basicCounts: {
        colors: colorCount,
        sizes: sizeCount,
        departments: departmentCount,
        employees: employeeCount,
        users: userCount,
        productPacks: productPackCount,
        products: productCount,
        processes: productProtsessCount,
      },
      detailedStats: {
        usersByRole: userRoleCounts,
        topColors: topColors.map(color => ({
          id: color.id,
          name: color.name,
          productCount: color._count.Product,
        })),
        topSizes: topSizes.map(size => ({
          id: size.id,
          name: size.name,
          productCount: size._count.Product,
        })),
        departmentStats: departmentProcessStats,
        topProductModels: productColorSizeDistribution.map(p => ({
          model: p.model,
          count: p._count ? 1 : 0, // Fixed: Handle potential undefined _count
        })),
      },
    };

    return res.status(200).json({
      success: true,
      data: modelCounts,
    });
  } catch (error) {
    console.error("Error fetching model counts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch model counts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get counts with date range filtering
 */
export const getModelCountsByDateRange = async (req: Request, res: Response) => {
  try {
    // Get date information from both query and body
    const startDateInput = req.query.startDate || req.body.startDate;
    const endDateInput = req.query.endDate || req.body.endDate;

    // Validate and parse dates
    let parsedStartDate: Date | undefined = undefined;
    let parsedEndDate: Date | undefined = undefined;

    if (startDateInput && typeof startDateInput === 'string') {
      try {
        parsedStartDate = new Date(startDateInput);
        if (isNaN(parsedStartDate.getTime())) {
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
          parsedEndDate = undefined;
        } else {
          // Add one day to include the entire end date
          parsedEndDate.setHours(23, 59, 59, 999);
        }
      } catch (e) {
        console.error('Error parsing end date:', e);
      }
    }

    // Construct date filter (fixed the error)
    const dateFilterCondition: Record<string, any> = {};
    if (parsedStartDate || parsedEndDate) {
      dateFilterCondition['createdAt'] = {
        ...(parsedStartDate && { gte: parsedStartDate }),
        ...(parsedEndDate && { lte: parsedEndDate })
      };
    }

    // Get counts for all models with date filtering
    const [
      colorCount,
      sizeCount,
      departmentCount,
      employeeCount,
      userCount,
      productPackCount,
      productCount,
      productProtsessCount,
    ] = await Promise.all([
      prisma.color.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.size.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.department.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.employee.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.user.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.productPack.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.product.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
      prisma.productProtsess.count({ where: Object.keys(dateFilterCondition).length > 0 ? dateFilterCondition : undefined }),
    ]);

    // Format the response
    const modelCounts = {
      dateRange: {
        startDate: parsedStartDate
          ? parsedStartDate.toISOString()
          : "No start date specified",
        endDate: parsedEndDate
          ? parsedEndDate.toISOString()
          : "No end date specified",
      },
      counts: {
        colors: colorCount,
        sizes: sizeCount,
        departments: departmentCount,
        employees: employeeCount,
        users: userCount,
        productPacks: productPackCount,
        products: productCount,
        processes: productProtsessCount,
      }
    };

    return res.status(200).json({
      success: true,
      data: modelCounts,
    });
  } catch (error) {
    console.error("Error fetching model counts with date range:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch model counts for the specified date range",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
