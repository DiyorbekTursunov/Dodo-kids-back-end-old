import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Accept a product pack that was sent from another department
export const acceptProductPack = async (req: Request, res: Response) => {
  const {
    productPackId,
    invalidCount = 0,
    invalidReason = "",
    employeeId,
  } = req.body;

  if (!productPackId || !employeeId) {
    return res
      .status(400)
      .json({ error: "Required fields are missing or invalid" });
  }

  // Validate invalidCount to ensure it's a non-negative integer
  const invalidCountNum = Number(invalidCount);
  if (
    isNaN(invalidCountNum) ||
    !Number.isInteger(invalidCountNum) ||
    invalidCountNum < 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid count must be a non-negative integer" });
  }

  try {
    // Find the product pack with its pending status
    const productPack = await prisma.productPack.findUnique({
      where: { id: productPackId },
      include: {
        processes: true,
        product: true,
      },
    });

    if (!productPack) {
      return res.status(404).json({ error: "Product pack not found" });
    }

    // Find the pending status
    const pendingStatus = productPack.processes.find(
      (status) => status.status === "Pending"
    );

    if (!pendingStatus) {
      return res
        .status(400)
        .json({ error: "Product pack does not have a pending status" });
    }

    // Validate the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check if department is "ombor" - if so, we will end the process
    const isQadoqlashDepartment =
      employee.department.name.toLowerCase() === "ombor" ||
      productPack.departmentName?.toLowerCase() === "ombor";

    // Validate that invalidCount doesn't exceed totalCount
    const totalCount = productPack.totalCount;
    if (invalidCountNum > totalCount) {
      return res.status(400).json({
        error: "Invalid count cannot exceed total count",
        total: totalCount,
      });
    }

    // Calculate acceptCount automatically
    const acceptCount = totalCount - invalidCountNum;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prismaClient) => {
      // 1. Delete the pending status
      await prismaClient.productProcess.delete({
        where: { id: pendingStatus.id },
      });

      // 2. Since we're accepting all non-invalid items, residueCount is always 0
      const residueCount = totalCount - acceptCount;

      // 3. Create new accepted status
      const newStatus = await prismaClient.productProcess.create({
        data: {
          processIsOver: isQadoqlashDepartment,
          status: "QabulQilingan",
          departmentId: productPack.departmentId,
          productPackId: productPackId,
          employeeId,
          acceptCount,
          sentCount: 0,
          residueCount,
          invalidCount: invalidCountNum,
          invalidReason: invalidReason || "",
        },
      });

      // 4. Update the product pack
      await prismaClient.productPack.update({
        where: { id: productPackId },
        data: { processIsOver: isQadoqlashDepartment },
      });

      return {
        newStatus,
        pendingStatusId: pendingStatus.id,
        isComplete: isQadoqlashDepartment,
      };
    });

    // Return success response
    res.status(200).json({
      message: `Successfully accepted ${acceptCount} items${
        invalidCountNum > 0 ? ` and marked ${invalidCountNum} as invalid` : ""
      }${
        result.isComplete
          ? ". Process completed as this is the final ombor department."
          : ""
      }`,
      deletedPendingStatus: result.pendingStatusId,
      newStatus: result.newStatus,
      isComplete: result.isComplete,
    });
  } catch (err) {
    console.error("Error accepting product pack:", err);
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message,
    });
  }
};
