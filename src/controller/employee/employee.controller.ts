// employee.controller.ts - Complete CRUD version
import { Request, Response, NextFunction } from "express";
import * as employeeService from "../../service/employee/employee.service";

// CREATE - Create new employee
export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { login, password, role, departmentId, name } = req.body;

    if (!login || !password || !role || !departmentId) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["login", "password", "role", "departmentId"]
      });
      return;
    }

    const result = await employeeService.createEmployeeService(
      login,
      password,
      role,
      departmentId,
      name
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// READ - Get all employees (with pagination and filtering)
export const getEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const departmentId = req.query.departmentId as string;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error: "Invalid pagination parameters",
        constraints: "page >= 1, limit between 1 and 100"
      });
      return;
    }

    const result = await employeeService.getEmployeesService(page, limit, departmentId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// READ - Get employee by ID
export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Employee ID is required" });
      return;
    }

    const employee = await employeeService.getEmployeeByIdService(id);
    res.status(200).json(employee);
  } catch (err) {
    next(err);
  }
};

// UPDATE - Update employee
export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { departmentId, login, password, role, name } = req.body;

    if (!id) {
      res.status(400).json({ error: "Employee ID is required" });
      return;
    }

    // Check if at least one field is provided for update
    if (!departmentId && !login && !password && !role && !name) {
      res.status(400).json({
        error: "No update data provided",
        availableFields: ["departmentId", "login", "password", "role", "name"]
      });
      return;
    }

    const result = await employeeService.updateEmployeeService(id, {
      departmentId,
      login,
      password,
      role,
      name,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE - Delete employee
export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Employee ID is required" });
      return;
    }

    const result = await employeeService.deleteEmployeeService(id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// UTILITY - Get employees by department
export const getEmployeesByDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { departmentId } = req.params;

    if (!departmentId) {
      res.status(400).json({ error: "Department ID is required" });
      return;
    }

    const result = await employeeService.getEmployeesByDepartmentService(departmentId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
