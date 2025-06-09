import { getNextDepartmentsService } from "../../service/departmentFlow/department_flow.service";
import { NextFunction, Request, Response } from "express";

export const getNextDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { departmentId } = req.params;

  try {
    const result = await getNextDepartmentsService(departmentId);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getNextDepartments:", error);

    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    const statusCode = message === "Department not found" ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};
