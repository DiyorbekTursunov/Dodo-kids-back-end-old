import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Input validation schema
const sendToDepartmentSchema = z.object({
  productPackId: z.string().uuid(),
  targetDepartmentId: z.string().uuid(),
  sendCount: z.number().int().positive(),
  invalidCount: z.number().int().nonnegative().optional().default(0),
  invalidReason: z.string().optional().default(""),
  employeeId: z.string().uuid(),
  outsourseCompanyId: z.string().uuid().optional().nullable(),
});

// Send Product Pack to another department
export const sendToDepartment = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = sendToDepartmentSchema.parse(req.body);

    const {
      productPackId,
      targetDepartmentId,
      sendCount,
      invalidCount,
      invalidReason,
      employeeId,
      outsourseCompanyId,
    } = validatedData;

    // Log input for debugging
    console.log("Input IDs:", {
      productPackId,
      targetDepartmentId,
      employeeId,
      outsourseCompanyId,
    });

    // Find the source product pack
    const sourceProductPack = await prisma.productPack.findUnique({
      where: { id: productPackId },
      include: {
        processes: true,
        product: true,
      },
    });

    if (!sourceProductPack) {
      return res.status(404).json({ error: "Product pack not found" });
    }

    // Get target department
    const targetDepartment = await prisma.department.findUnique({
      where: { id: targetDepartmentId },
    });

    if (!targetDepartment) {
      return res.status(404).json({ error: "Target department not found" });
    }

    // Validate employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res
        .status(404)
        .json({ error: `Employee not found for ID: ${employeeId}` });
    }

    // Validate outsourse company if provided
    let actualOutsourseCompanyName = null;
    if (outsourseCompanyId) {
      actualOutsourseCompanyName = await prisma.outsourseCompany.findUnique({
        where: { id: outsourseCompanyId },
      });

      if (!actualOutsourseCompanyName) {
        return res.status(404).json({
          error: `Outsourse Company not found for ID: ${outsourseCompanyId}`,
        });
      }
    }

    // Find the latest status
    const latestStatus =
      sourceProductPack.processes.length > 0
        ? sourceProductPack.processes.reduce((latest, current) => {
            if (!latest) return current;
            if (latest.createdAt && current.createdAt) {
              return new Date(current.createdAt) > new Date(latest.createdAt)
                ? current
                : latest;
            }
            return current;
          })
        : null;

    if (!latestStatus) {
      return res
        .status(400)
        .json({ error: "Product pack has no status history" });
    }

    // Get the total count from the product pack
    const totalCount = sourceProductPack.totalCount;

    // Calculate cumulative counts
    const currentlySentCount = sourceProductPack.processes.reduce(
      (sum, status) => sum + (status.sentCount || 0),
      0
    );

    const currentlyInvalidCount = sourceProductPack.processes.reduce(
      (sum, status) => sum + (status.invalidCount || 0),
      0
    );

    // Calculate new cumulative totals
    const newSendedCount = currentlySentCount + Number(sendCount);
    const newInvalidCount = currentlyInvalidCount + Number(invalidCount);

    // Calculate available count
    const availableCount =
      totalCount - currentlySentCount - currentlyInvalidCount;

    // Validate sending count
    if (Number(sendCount) + Number(invalidCount) > availableCount) {
      return res.status(400).json({
        error: "Cannot send more than available items",
        available: availableCount,
        requested: Number(sendCount) + Number(invalidCount),
      });
    }

    // Determine if process is complete
    const isComplete = newSendedCount + newInvalidCount === totalCount;
    const newStatus = isComplete ? "Yuborilgan" : "To'liq yuborilmagan";

    // Calculate remaining items
    const residueCount = totalCount - newSendedCount - newInvalidCount;

    // Prepare base data for new source status
    const newSourceStatusData: Prisma.ProductProcessUncheckedCreateInput = {
      processIsOver: isComplete,
      status: newStatus,
      departmentId: sourceProductPack.departmentId,
      productPackId: productPackId,
      employeeId,
      acceptCount: totalCount,
      sentCount: Number(sendCount),
      residueCount,
      invalidCount: Number(invalidCount),
      invalidReason: invalidReason || "",
      senderDepartment: sourceProductPack.departmentName,
      receiverDepartment: targetDepartment.name,
      senderDepartmentId: sourceProductPack.departmentId,
      receiverDepartmentId: targetDepartmentId,
      outsourseCompanyId: outsourseCompanyId, // Use foreign key directly
    };

    // Create a new status for the source product pack
    const newSourceStatus = await prisma.productProcess.create({
      data: newSourceStatusData,
    });

    // Update the source ProductPack's processIsOver flag if needed
    if (isComplete) {
      await prisma.productPack.update({
        where: { id: productPackId },
        data: { processIsOver: true },
      });
    }

    // Get the parent ID from the source product pack
    const parentId = sourceProductPack.parentId || sourceProductPack.id;

    // Prepare base data for new product pack process
    const newProcessData: Prisma.ProductProcessUncheckedCreateWithoutProductPackInput =
      {
        processIsOver: false,
        status: "Pending",
        departmentId: targetDepartmentId,
        employeeId,
        acceptCount: 0,
        totalCount: totalCount,
        sentCount: Number(sendCount),
        residueCount: Number(sendCount),
        invalidCount: 0,
        invalidReason: "",
        senderDepartmentId: sourceProductPack.departmentId,
        receiverDepartmentId: targetDepartmentId,
        senderDepartment: sourceProductPack.departmentName,
        receiverDepartment: targetDepartment.name,
        outsourseCompanyId: outsourseCompanyId, // Use foreign key directly
      };

    // Create a new ProductPack for the target department
    const newProductPack = await prisma.productPack.create({
      data: {
        parentId,
        departmentId: targetDepartmentId,
        departmentName: targetDepartment.name,
        productId: sourceProductPack.productId,
        totalCount: Number(sendCount),
        processIsOver: false,
        processes: {
          create: newProcessData,
        },
      },
      include: {
        processes: true,
        product: true,
      },
    });

    // Return success response
    res.status(200).json({
      message: `Successfully sent ${sendCount} items to ${targetDepartment.name} department`,
      sourceStatus: newSourceStatus,
      newProductPack,
      remainingItems: residueCount,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: err.errors,
      });
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      const meta = err.meta || {};
      return res.status(400).json({
        error: "Foreign key constraint violation",
        details: `Invalid reference: ${JSON.stringify(meta)}`,
      });
    }
    console.error("Error sending product to department:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({
      error: "Internal server error",
      details: errorMessage,
    });
  } finally {
    await prisma.$disconnect();
  }
};
