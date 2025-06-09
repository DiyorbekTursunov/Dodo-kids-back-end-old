import {
  createColor,
  deleteColor,
  getColorById,
  getColors,
  updateColor,
} from "../controller/color/color.controller";
import { authenticate } from "../middleware/authMiddleware";
import express from "express";

const router = express.Router();

// Simplified route handlers
router.post("/", authenticate, createColor);
router.get("/", getColors);
router.get("/:id", getColorById);
router.put("/:id", authenticate, updateColor);
router.delete("/:id", authenticate, deleteColor);

export default router;
