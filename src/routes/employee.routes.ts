// employee.routes.ts - Complete routing setup
import { Router } from "express";
import * as employeeController from "@/controller/employee/employee.controller";
import { errorHandler } from "@/service/employee/employee.service";

const router = Router();

// CREATE - POST /employees
router.post("/", employeeController.createEmployee);

// READ - GET /employees (with query params for pagination and filtering)
// Example: GET /employees?page=1&limit=10&departmentId=uuid
router.get("/", employeeController.getEmployees);

// READ - GET /employees/:id
router.get("/:id", employeeController.getEmployeeById);

// UPDATE - PUT /employees/:id
router.put("/:id", employeeController.updateEmployee);

// DELETE - DELETE /employees/:id
router.delete("/:id", employeeController.deleteEmployee);

// UTILITY - GET /employees/department/:departmentId
router.get(
  "/department/:departmentId",
  employeeController.getEmployeesByDepartment
);


export default router;
