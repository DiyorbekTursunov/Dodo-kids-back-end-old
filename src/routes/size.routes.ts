import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { getSizes, getSizeById, createSize, updateSize, deleteSize } from "../controller/size/size.controller";

const router = Router();

// Get all sizes
router.get("/", getSizes);

// Get size by ID
router.get("/:id", getSizeById);

// Create a size
router.post("/", authenticate, createSize);

// Update a size
router.patch("/:id", authenticate, updateSize);

// Delete a size
router.delete("/:id", authenticate, deleteSize);

export default router;
