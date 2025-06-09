import express, { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { getFilteredProductPacks } from "../controller/filter/filter.controller";
import { searchProductsByModel } from "../controller/search/search.controller";



const router = express.Router();

// Product Pack filter route
router.get("/search", (req: Request, res: Response, next: NextFunction) => {
    searchProductsByModel(req, res).catch(next);
});

export default router;
