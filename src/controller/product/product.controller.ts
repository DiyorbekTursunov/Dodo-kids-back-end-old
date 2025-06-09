import { Request, Response } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../../service/product/product.service";

export const createProductController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { model, colorIds, sizeIds, files } = req.body;

  try {
    // Input validation
    if (!model) {
      res.status(400).json({ error: "Product model is required" });
      return;
    }
    if (!colorIds || !Array.isArray(colorIds) || colorIds.length === 0) {
      res.status(400).json({ error: "At least one color ID is required" });
      return;
    }
    if (!sizeIds || !Array.isArray(sizeIds) || sizeIds.length === 0) {
      res.status(400).json({ error: "At least one size ID is required" });
      return;
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: "At least one file is required" });
        return;
    }
  
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!colorIds.every((id: string) => uuidRegex.test(id))) {
      res.status(400).json({ error: "Invalid UUID format for color IDs" });
      return;
    }
    if (!sizeIds.every((id: string) => uuidRegex.test(id))) {
      res.status(400).json({ error: "Invalid UUID format for size IDs" });
      return;
    }

    const product = await createProduct({ model, colorIds, sizeIds, files });
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    const message = (error as Error).message;
    const status =
      message.includes("not found") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? message : "Internal server error",
      details: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }
};

export const getAllProductsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { products, total } = await getAllProducts(skip, limit);
    res.status(200).json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : undefined,
    });
  }
};

export const getProductByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ error: "Invalid UUID format for product ID" });
      return;
    }
    const product = await getProductById(id);
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    const message = (error as Error).message;
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({
      error: status === 404 ? message : "Internal server error",
      details: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }
};

export const updateProductController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { model, colorIds, sizeIds } = req.body;

  try {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ error: "Invalid UUID format for product ID" });
      return;
    }
    if (model && typeof model !== "string") {
      res.status(400).json({ error: "Model must be a string" });
      return;
    }
    if (
      colorIds &&
      (!Array.isArray(colorIds) ||
        !colorIds.every((id: string) => uuidRegex.test(id)))
    ) {
      res
        .status(400)
        .json({ error: "Color IDs must be an array of valid UUIDs" });
      return;
    }
    if (
      sizeIds &&
      (!Array.isArray(sizeIds) ||
        !sizeIds.every((id: string) => uuidRegex.test(id)))
    ) {
      res
        .status(400)
        .json({ error: "Size IDs must be an array of valid UUIDs" });
      return;
    }

    const product = await updateProduct(id, { model, colorIds, sizeIds });
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    const message = (error as Error).message;
    const status =
      message.includes("not found") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? message : "Internal server error",
      details: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }
};

export const deleteProductController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ error: "Invalid UUID format for product ID" });
      return;
    }
    await deleteProduct(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    const message = (error as Error).message;
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({
      error: status === 404 ? message : "Internal server error",
      details: process.env.NODE_ENV === "development" ? message : undefined,
    });
  }
};
