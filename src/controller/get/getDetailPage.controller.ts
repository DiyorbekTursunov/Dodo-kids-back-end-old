// src/controllers/productPack.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProductPackById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const pack = await prisma.productPack.findUnique({
      where: { id },
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
          take: 1, // latest status
        },
      },
    });

    if (!pack) {
      return res.status(404).json({ error: "Product pack not found" });
    }

    res.status(200).json({
      ...pack,
      latestStatus: pack.processes[0] || null,
      status: undefined,
    });
  } catch (error) {
    console.error("Error fetching product pack:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
