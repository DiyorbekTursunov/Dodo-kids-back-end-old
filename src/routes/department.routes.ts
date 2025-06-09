import express from "express";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
} from "../controller/department/department.controller";
import { getNextDepartments } from "../controller/departmentflow/department_flow.controller";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

// Department core routes
router.post("/", createDepartment);
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.put("/:id", authenticate, updateDepartment);
router.delete("/:id", authenticate, deleteDepartment);

// Department flow route
router.get("/next/:departmentId", getNextDepartments);

export default router;
