import { Router } from "express";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  logoutUser,
} from "../controller/auth/auth.controller";
import { authenticate } from "../middleware/authMiddleware";
import * as authController from "../controller/auth/auth.controller";

const router = Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

router.get("/me", authenticate, authController.getCurrentUser);
export default router;
