import { Request, Response, NextFunction } from "express";
import * as departmentService from "../../service/department/department.service";

export const createDepartment = async (
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

    const department = await departmentService.createDepartmentService(name);
    res.status(201).json({
      message: "Department created successfully",
      data: department
    });
  } catch (err) {
    next(err);
  }
};

export const getDepartments = async (
  _: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const departments = await departmentService.getDepartmentsService();
    res.status(200).json(departments);
  } catch (err) {
    next(err);
  }
};

export const getDepartmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const department = await departmentService.getDepartmentByIdService(id);
    res.status(200).json(department);
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (
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

    const updated = await departmentService.updateDepartmentService(id, name);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await departmentService.deleteDepartmentService(id);
    res.status(200).json({
      message: "Department deleted successfully",
      data: deleted
    });
  } catch (err) {
    next(err);
  }
};
