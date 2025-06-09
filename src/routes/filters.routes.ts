import express, { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { getFilteredProductPacks } from "../controller/filter/filter.controller";


const router = express.Router();

// Product Pack filter route
router.get("/filter", (req: Request, res: Response, next: NextFunction) => {
  getFilteredProductPacks(req, res).catch(next);
});

export default router;
