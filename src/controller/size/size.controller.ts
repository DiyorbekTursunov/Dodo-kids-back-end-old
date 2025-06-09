import { Request, Response, NextFunction } from "express";
import {
  getAllSizes,
  getSizeById as getSizeByIdService,
  createSize as createSizeService,
  updateSize as updateSizeService,
  deleteSize as deleteSizeService,
} from "../../service/size/size.service";

// Get all sizes
export const getSizes = async (
  _: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sizes = await getAllSizes();
    res.status(200).json(sizes);
  } catch (err) {
    next(err);
  }
};

// Get size by ID
export const getSizeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const size = await getSizeByIdService(id);
    if (!size) {
      res.status(404).json({ error: "Size not found" });
      return;
    }
    res.status(200).json(size);
  } catch (err) {
    next(err);
  }
};

// Create a size
export const createSize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const size = await createSizeService(name);
    res.status(201).json(size);
  } catch (err) {
    next(err);
  }
};

// Update a size
export const updateSize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const updated = await updateSizeService(id, name);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// Delete a size
export const deleteSize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteSizeService(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
