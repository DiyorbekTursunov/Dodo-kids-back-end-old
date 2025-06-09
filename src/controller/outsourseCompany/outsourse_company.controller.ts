import { Request, Response, NextFunction } from "express";
import * as companyService from "../../service/outsourseCompany/outsourse_company.service";

export const createOutsourseCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const created = await companyService.createOutsourseCompanyService(name);
    res.status(201).json({ message: "Created successfully", data: created });
  } catch (err) {
    next(err);
  }
};

export const getAllOutsourseCompanies = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await companyService.getOutsourseCompaniesService();
    console.log(data);

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const getOutsourseCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = await companyService.getOutsourseCompanyByIdService(id);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const updateOutsourseCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const updated = await companyService.updateOutsourseCompanyService(id, name);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteOutsourseCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const deleted = await companyService.deleteOutsourseCompanyService(id);
    res.status(200).json({ message: "Deleted successfully", data: deleted });
  } catch (err) {
    next(err);
  }
};
