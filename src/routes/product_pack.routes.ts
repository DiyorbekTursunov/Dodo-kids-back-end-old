import express, { Request, Response, NextFunction } from "express";

import { authenticate } from "../middleware/authMiddleware";
import { addWareHouse } from "../controller/addProdcutPack/addProdcutPack.controller";
import { getAllProductPacks } from "../controller/addProdcutPack/addProdcutPack_get_all.controller";
import { sendToDepartment } from "../controller/sendToDepartment/product_pack.send.controller";
import { getSentProductPacks } from "../controller/sendToDepartment/product_pack.send_get_all.controller";
import { acceptProductPack } from "../controller/acceptanceToDepartment/product_pack.acceptance.controller";
import { getAccesltenceProductPacks } from "../controller/acceptanceToDepartment/product_pack.acceptance_get_all.controller";
import { getConsolidatedCaseTrackerStatus } from "../controller/get/getMapPage.controller";
import { getPandingProductPacks } from "../controller/get/getPanding.controller";
import { getProductPackById } from "../controller/get/getDetailPage.controller";
import { getAllProductPacksById } from "../controller/addProdcutPackDepartmentID/addProdcutPack_get_all.controller";
import { getAllProductPacksByIdHistory } from "../controller/addProdcutPackDepartmentIDHistory/addProdcutPack_get_all.controller";


const router = express.Router();

router.get(
  "/details/:id",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getProductPackById(req, res).catch(next);
  }
);

router.get(
  "/status-map",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getConsolidatedCaseTrackerStatus(req, res).catch(next);
  }
);

router.post(
  "/add-warehouse",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    addWareHouse(req, res).catch(next);
  }
);

router.get(
  "/get-all-warehouse",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getAllProductPacks(req, res).catch(next);
  }
);

router.get(
  "/get-all-warehouse/:departmentId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getAllProductPacksById(req, res).catch(next);
  }
);

router.get(
  "/get-all-warehouse-history/:departmentId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getAllProductPacksByIdHistory(req, res).catch(next);
  }
);

router.post(
  "/send-to-department",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    sendToDepartment(req, res).catch(next);
  }
);

router.get(
  "/send-to-department/:departmentId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getSentProductPacks(req, res).catch(next);
  }
);

router.post(
  "/acceptance-to-department",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    acceptProductPack(req, res).catch(next);
  }
);

router.get(
  "/acceptance-to-department/:departmentId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getAccesltenceProductPacks(req, res).catch(next);
  }
);

router.get(
  "/panding-to-department/:departmentId",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getPandingProductPacks(req, res).catch(next);
  }
);

export default router;
