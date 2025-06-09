import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const prisma = new PrismaClient();

// Input validation schema
const warehouseSchema = z.object({
  departmentId: z.string().uuid(),
  productId: z.string().uuid(),
  totalCount: z.number().int().positive(),
  invalidCount: z.number().int().nonnegative().optional().default(0),
  invalidReason: z.string().optional().default(""),
  employeeId: z.string().uuid(),
  departmentName: z.string().optional(),
});

export const addWareHouse = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = warehouseSchema.parse(req.body);

    const {
      departmentId,
      productId,
      totalCount,
      invalidCount,
      invalidReason,
      employeeId,
      departmentName,
    } = validatedData;

    // Log input IDs for debugging
    console.log("Input IDs:", { productId, departmentId, employeeId });

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: `Product not found for ID: ${productId}` });
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(404).json({ error: `Department not found for ID: ${departmentId}` });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    console.log("Employee check:", employee ? "exists" : "does not exist");

    if (!employee) {
      return res.status(404).json({ error: `Employee not found for ID: ${employeeId}` });
    }

    // Generate a parent ID
    const parentId = uuidv4();

    // Create the product pack
    const productPack = await prisma.productPack.create({
      data: {
        parentId: parentId,
        departmentName: departmentName ?? department.name,
        totalCount,
        processIsOver: false,
        product: {
          connect: { id: productId },
        },
        department: {
          connect: { id: departmentId },
        },
        processes: {
          create: {
            status: "QabulQilingan",
            departmentId,
            employeeId: employeeId ?? null,
            acceptCount: totalCount,
            sentCount: 0,
            residueCount: totalCount,
            invalidCount,
            invalidReason,
          },
        },
      } as unknown as Prisma.ProductPackCreateInput,
      include: {
        product: true,
        processes: true,
        department: true,
      },
    });

    return res.status(201).json(productPack);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: err.errors,
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      const meta = err.meta || {};
      return res.status(400).json({
        error: "Foreign key constraint violation",
        details: `Invalid reference: ${JSON.stringify(meta)}`,
      });
    }

    console.error("Error creating Product Pack:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
