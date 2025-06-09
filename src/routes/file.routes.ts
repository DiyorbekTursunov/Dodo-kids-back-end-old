import express from "express";
import {
  upload,
  uploadFile,
  uploadMultipleFiles,
  getFileById,
  deleteFile,
  getAllFiles,
} from "../controller/files/file.controller";
import { authenticate } from "../middleware/authMiddleware"; // Assuming you have an auth middleware

const router = express.Router();

// Apply authentication middleware to all routes if needed
// router.use(authenticate);

// Upload a single file
router.post("/upload", upload.single("file"), uploadFile);

// Upload multiple files
router.post("/upload/multiple", upload.array("files", 10), uploadMultipleFiles);

// Get file by ID
router.get("/:id", getFileById);

// Delete file
router.delete("/:id", authenticate, deleteFile);

router.get("/", getAllFiles);

export default router;
