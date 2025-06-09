import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Search products by model name and filter by status
 */
export const searchProductsByModel = async (req: Request, res: Response) => {
  try {
    const searchTerm = (req.query.query as string) || "";
    const statusFilter = req.query.status as string | undefined;

    // Find product packs associated with products matching the search term
    const productPacks = await prisma.productPack.findMany({
      where: {
        product: {
          model: {
            contains: searchTerm,
            mode: "insensitive" as const,
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
        processes: true,
      },
    });

    // Process status information for each product pack
    const processedProductPacks = productPacks.map((pack) => {
      // Find the latest status entry for this product pack
      const latestStatus =
        pack.processes.length > 0
          ? pack.processes.reduce((latest, current) =>
              new Date(current.updatedAt) > new Date(latest.updatedAt)
                ? current
                : latest
            )
          : null;

      // Map status values as required
      let statusValue = "";
      if (latestStatus) {
        if (latestStatus.status === "Pending") {
          statusValue = "Pending";
        } else if (latestStatus.status === "Qabul qilingan") {
          statusValue = "Qabul qilingan";
        } else if (
          (latestStatus.sentCount ?? 0) < (latestStatus.acceptCount ?? 0)
        ) {
          statusValue = "To'liq yuborilmagan";
        } else {
          statusValue = "Yuborilgan";
        }
      }

      return {
        ...pack,
        processedStatus: statusValue,
      };
    });

    // First filter out "Pending" status items by default (unless explicitly requested)
    let filteredProductPacks =
      statusFilter === "Pending"
        ? processedProductPacks.filter(
            (pack) => pack.processedStatus === "Pending"
          )
        : processedProductPacks.filter(
            (pack) => pack.processedStatus !== "Pending"
          );

    // Special handling for "To'liq yuborilmagan" or "Yuborilgan" status filters
    if (
      statusFilter === "To'liq yuborilmagan" ||
      statusFilter === "Yuborilgan"
    ) {
      // Return both statuses together when either is requested
      filteredProductPacks = processedProductPacks.filter(
        (pack) =>
          pack.processedStatus === "To'liq yuborilmagan" ||
          pack.processedStatus === "Yuborilgan"
      );
    }
    // Apply other status filters normally if provided (and not one of the special cases)
    else if (statusFilter && statusFilter !== "Pending") {
      filteredProductPacks = filteredProductPacks.filter(
        (pack) => pack.processedStatus === statusFilter
      );
    }

    return res.status(200).json({
      data: filteredProductPacks,
    });
  } catch (error) {
    console.error("Error searching product packs:", error);
    return res.status(500).json({
      error: "Failed to search product packs",
      details: (error as Error).message,
    });
  }
};
