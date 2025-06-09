import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get detailed stats for a specific employee
export const getEmployeeStats = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Log the employeeId for debugging
    console.log("Employee ID from params:", employeeId);

    // Validate that employeeId exists and is not undefined
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Check if the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get all processes handled by this employee
    const employeeProcesses = await prisma.productProtsess.findMany({
      where: {
        employeeId,
      },
      select: {
        productpackId: true,
      },
      distinct: ["productpackId"],
    });

    // Get the IDs of all ProductPacks handled by this employee
    const productPackIds = employeeProcesses.map(
      (process) => process.productpackId
    );

    // Get all ProductPacks this employee has worked on
    const productPacks = await prisma.productPack.findMany({
      where: {
        id: {
          in: productPackIds,
        },
      },
      select: {
        id: true,
        name: true,
        totalCount: true,
        protsessIsOver: true,
        department: true,
        Product: {
          select: {
            model: true,
          },
        },
      },
    });

    // Get aggregated stats for all processes handled by this employee
    const stats = await prisma.productProtsess.aggregate({
      where: {
        employeeId,
      },
      _sum: {
        sendedCount: true,
        invalidCount: true,
        residueCount: true,
        acceptCount: true,
      },
    });

    // Get detailed process records for this employee
    const processes = await prisma.productProtsess.findMany({
      where: {
        employeeId,
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
        productPack: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate the total count of all products this employee has worked on
    const totalProductCount = productPacks.reduce(
      (sum, pack) => sum + pack.totalCount,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          department: employee.department.name,
        },
        totalProductCount,
        productPackCount: productPacks.length,
        stats: {
          sendedCount: stats._sum.sendedCount || 0,
          invalidCount: stats._sum.invalidCount || 0,
          residueCount: stats._sum.residueCount || 0,
          acceptCount: stats._sum.acceptCount || 0,
        },
        productPacks,
        processes,
      },
    });
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
