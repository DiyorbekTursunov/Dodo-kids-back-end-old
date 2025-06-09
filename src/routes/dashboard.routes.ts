import { getAllModelCounts } from "../controller/dashboardController/get_all_admin.controller";
import { getDashboardStats } from "../controller/dashboardController/dashboard.all_stats.controller";
import { getDashboardStatsByDateRange } from "../controller/dashboardController/dashboard.all_stats_date.controller";
import { getProductPackStats } from "../controller/dashboardController/dashboard.product_pack_id.controller";
import { getEmployeeStats } from "../controller/dashboardController/dashboard.stats_dp_id.controller";
import express, { Request, Response, NextFunction } from "express";
import { getCaseTrackerStatus } from "../controller/filter/filterMap/filter_map.controller";

const router = express.Router();

router.get(
  "/search-filter-map",
  (req: Request, res: Response, next: NextFunction) => {
    getCaseTrackerStatus(req, res).catch(next);
  }
);

/**
 * @route GET /api/dashboard/stats
 * @desc Get all dashboard statistics
 * @access Private
 */
router.get(
  "/stats-all-models-count",
  (req: Request, res: Response, next: NextFunction) => {
    getAllModelCounts(req, res).catch(next);
  }
);

/**
 * @route GET /api/dashboard/stats/:departmentId
 * @desc Get employee statistics for a specific department
 * @access Private
 */
router.get(
  "/stats/:departmentId",
  (req: Request, res: Response, next: NextFunction) => {
    getEmployeeStats(req, res).catch(next);
  }
);

/**
 * @route GET /api/dashboard/productpack/:id
 * @desc Get statistics for a specific product pack
 * @access Private
 */
router.get(
  "/productpack/:id",
  (req: Request, res: Response, next: NextFunction) => {
    getProductPackStats(req, res).catch(next);
  }
);

router.get("/stats", (req: Request, res: Response, next: NextFunction) => {
  getDashboardStats(req, res).catch(next);
});

router.post(
  "/stats-by-date",
  (req: Request, res: Response, next: NextFunction) => {
    getDashboardStatsByDateRange(req, res).catch(next);
  }
);

router.get(
  "/stats/:departmentId",
  (req: Request, res: Response, next: NextFunction) => {
    getEmployeeStats(req, res).catch(next);
  }
);

router.get(
  "/productpack/:id",
  (req: Request, res: Response, next: NextFunction) => {
    getProductPackStats(req, res).catch(next);
  }
);

export default router;
