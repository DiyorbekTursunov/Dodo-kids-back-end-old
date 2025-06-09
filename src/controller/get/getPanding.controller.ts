import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get Sent Product Packs for a Department
export const getPandingProductPacks = async (
  req: Request,
  res: Response
) => {
  const { departmentId } = req.params;

  if (!departmentId) {
    return res.status(400).json({ error: "Department ID is required" });
  }

  try {
    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get product packs with latest status "Yuborilgan"
    const sentProductPacks = await prisma.productPack.findMany({
      where: {
        departmentId,
        processes: {
          some: {
            status: "Pending",
          },
        },
      },
      include: {
        product: {
          include: {
            colors: true,
            sizes: true,
          },
        },
        processes: {
          orderBy: {
            date: "desc",
          },
          where: {
            status: "Pending",
          },
        },
      },
    });

    // Format the response
    const formattedPacks = sentProductPacks.map((pack) => ({
      ...pack,
      latestStatus: pack.processes[0] || null,
      status: undefined,
    }));

    res.status(200).json(formattedPacks);
  } catch (err) {
    console.error("Error fetching sent product packs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
