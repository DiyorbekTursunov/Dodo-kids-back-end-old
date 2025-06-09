import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define interfaces for our data structures
interface FormattedProductPack {
  id: string;
  //   name: string | null;
  department: string;
  protsessIsOver: boolean;
  perentId?: string;
  Product: {
    id: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
    color?: { id: string; name: string }[];
    size?: { id: string; name: string }[];
  };
  totalCount: number;
  isSent: boolean;
  status: string;
  processedStatus: string;
}

interface GroupedProductPacks {
  perentId: string;
  data: FormattedProductPack[];
}

// Define a type for our grouping object
interface GroupByParentMap {
  [parentId: string]: GroupedProductPacks;
}

// Type definition for case tracker filter parameters
interface CaseTrackerFilterParams {
  startDate?: string | undefined;
  endDate?: string | undefined;
  searchName?: string | undefined;
  departmentId?: string | undefined;
  status?: string | undefined;
  includePending?: boolean | undefined;
  colorId?: string | undefined;
  sizeId?: string | undefined;
}

/**
 * Extract filter parameters from request (both query and body)
 * Safely handles undefined values
 */
function extractCaseTrackerFilterParams(req: Request): CaseTrackerFilterParams {
  // Safely get value from request
  const safeGetValue = (key: string): string | undefined => {
    return (
      (req.query[key] as string | undefined) ||
      (req.body && req.body[key] ? (req.body[key] as string) : undefined)
    );
  };

  // Get search name from multiple possible keys
  const getSearchName = (): string | undefined => {
    return (
      safeGetValue("search") ||
      safeGetValue("searchName") ||
      safeGetValue("name")
    );
  };

  // Get includePending parameter - default to TRUE unless explicitly set to false
  const getIncludePending = (): boolean => {
    const includePendingParam = safeGetValue("includePending");
    // Only return false if explicitly set to false/0
    if (includePendingParam === "false") return false;
    if (includePendingParam === "0") return false;
    return true; // Default to true - include pending items
  };

  return {
    startDate: safeGetValue("startDate"),
    endDate: safeGetValue("endDate"),
    searchName: getSearchName(),
    departmentId: safeGetValue("departmentId"),
    status: safeGetValue("status"),
    includePending: getIncludePending(),
    colorId: safeGetValue("colorId"),
    sizeId: safeGetValue("sizeId"),
  };
}

/**
 * Get case tracker status for product packs with filtering options
 * Returns status information grouped by parentIds
 * Supports filtering by date range, name/model search, department, status, color, and size
 */
export const getCaseTrackerStatus = async (req: Request, res: Response) => {
  try {
    // Extract filter parameters
    const filters = extractCaseTrackerFilterParams(req);

    console.log("Case tracker filter inputs:", filters);

    // Build the filter for the Prisma query
    const queryFilter: any = {};

    // Parse and apply date filters correctly
    if (filters.startDate || filters.endDate) {
      // Create date range filter directly on ProductPack creation date
      queryFilter.createdAt = {};

      if (filters.startDate) {
        try {
          const parsedStartDate = new Date(filters.startDate);
          if (!isNaN(parsedStartDate.getTime())) {
            queryFilter.createdAt.gte = parsedStartDate;
            console.log("Applying start date filter:", parsedStartDate);
          } else {
            console.error("Invalid start date format:", filters.startDate);
          }
        } catch (e) {
          console.error("Error parsing start date:", e);
        }
      }

      if (filters.endDate) {
        try {
          const parsedEndDate = new Date(filters.endDate);
          if (!isNaN(parsedEndDate.getTime())) {
            // Add one day to include the entire end date
            parsedEndDate.setHours(23, 59, 59, 999);
            queryFilter.createdAt.lte = parsedEndDate;
            console.log("Applying end date filter:", parsedEndDate);
          } else {
            console.error("Invalid end date format:", filters.endDate);
          }
        } catch (e) {
          console.error("Error parsing end date:", e);
        }
      }
    }

    // Apply department filter
    if (filters.departmentId) {
      queryFilter.departmentId = filters.departmentId;
    }

    // Apply color and size filtering logic
    if (filters.colorId || filters.sizeId) {
      queryFilter.Product = {
        ...(queryFilter.Product || {}),
      };

      if (filters.colorId) {
        queryFilter.Product.color = {
          some: {
            id: filters.colorId,
          },
        };
      }

      if (filters.sizeId) {
        queryFilter.Product.size = {
          some: {
            id: filters.sizeId,
          },
        };
      }
    }

    // Apply name search filter for both product name and model
    if (filters.searchName) {
      const searchTerm = filters.searchName.trim();

      if (searchTerm) {
        const searchConditions = {
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
            {
              Product: {
                model: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        };

        // Merge with existing conditions
        if (Object.keys(queryFilter).length > 0) {
          queryFilter.AND = queryFilter.AND || [];
          queryFilter.AND.push(searchConditions);
        } else {
          Object.assign(queryFilter, searchConditions);
        }
      }
    }

    // Debug log to inspect the final query filter
    console.log(
      "Final Prisma query filter:",
      JSON.stringify(queryFilter, null, 2)
    );

    // Get product packs with applied filters and their latest status
    const productPacks = await prisma.productPack.findMany({
      where: queryFilter,
      include: {
        product: {
          select: {
            id: true,
            model: true,
            createdAt: true,
            updatedAt: true,
            colors: true, // Include color relation
            sizes: true, // Include size relation
          },
        },
        processes: {
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Debug log for raw results
    console.log("Raw product packs count:", productPacks.length);
    if (productPacks.length > 0) {
      console.log(
        "Sample product pack color data:",
        productPacks[0].product.colors
          ? JSON.stringify(productPacks[0].product.colors, null, 2)
          : "No color data"
      );
    }

    // Format individual product packs
    let formattedPacks = productPacks.map((pack) => {
      // Get the latest status entry
      const latestStatus = pack.processes.length > 0 ? pack.processes[0] : null;
      const rawStatus = latestStatus?.status || "";

      // Determine the processed status
      let processedStatus = rawStatus;

      // Special statuses that are already processed
      const specialStatuses = [
        "Pending",
        "QabulQilingan",
        "ToliqYuborilmagan",
        "Yuborilgan",
      ];

      // Calculate the processed status if needed
      if (!specialStatuses.includes(rawStatus) && latestStatus) {
        if ((latestStatus.sentCount ?? 0) < (latestStatus.acceptCount ?? 0)) {
          processedStatus = "To'liq yuborilmagan";
        } else {
          processedStatus = "Yuborilgan";
        }
      }

      return {
        id: pack.id,
        department: pack.departmentName ?? "",
        protsessIsOver: pack.processIsOver,
        // Convert null to undefined for perentId
        perentId: pack.parentId ?? undefined,
        Product: {
          id: pack.product.id,
          model: pack.product.model,
          createdAt: pack.product.createdAt,
          updatedAt: pack.product.updatedAt,
          color: pack.product.colors,
          size: pack.product.sizes,
        },
        totalCount: pack.totalCount,
        isSent: processedStatus === "Yuborilgan",
        status: rawStatus,
        processedStatus: processedStatus,
      };
    });

    // Apply status filter if provided (post-database filter)
    if (filters.status) {
      const status = filters.status.trim();
      formattedPacks = formattedPacks.filter(
        (p) => p.status === status || p.processedStatus === status
      );
    } else if (filters.includePending === false) {
      // Only exclude pending if explicitly told to
      console.log("Excluding pending items as includePending is false");
      formattedPacks = formattedPacks.filter(
        (p) => p.status !== "Pending" && p.processedStatus !== "Pending"
      );
    } else {
      // Log that we're including all items including pending
      console.log(
        "Including all items (including pending) as includePending is not explicitly false"
      );
    }

    // Group by parentId with proper TypeScript typing
    const groupedByParent: GroupByParentMap = {};

    formattedPacks.forEach((pack) => {
      const parentId = pack.perentId || ""; // Use empty string if parentId is null/undefined

      if (!groupedByParent[parentId]) {
        groupedByParent[parentId] = {
          perentId: parentId,
          data: [],
        };
      }

      groupedByParent[parentId].data.push(pack);
    });

    // Convert to array format
    const result = Object.values(groupedByParent);

    return res.status(200).json({
      success: true,
      count: formattedPacks.length,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching case tracker status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch case tracker status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
