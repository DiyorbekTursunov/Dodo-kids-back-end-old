import { Request, Response, NextFunction } from "express";
import * as colorService from "../../service/color/color.service";

export const createColor = async (
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

    const color = await colorService.createColorService(name);
    res.status(201).json({ message: "Color created successfully", data: color });
  } catch (err) {
    next(err);
  }
};

export const getColors = async (
  _: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colors = await colorService.getColorsService();
    res.status(200).json(colors);
  } catch (err) {
    next(err);
  }
};

export const getColorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const color = await colorService.getColorByIdService(id);
    res.status(200).json(color);
  } catch (err) {
    next(err);
  }
};

export const updateColor = async (
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

    const updated = await colorService.updateColorService(id, name);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteColor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await colorService.deleteColorService(id);
    res.status(200).json({ message: "Color deleted successfully", data: deleted });
  } catch (err) {
    next(err);
  }
};
