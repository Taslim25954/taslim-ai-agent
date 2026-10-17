import express from "express";

import {
  register,
  verifyEmail,
  login,
  getMe,
  devGetVerifyToken,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "../controllers/authController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", register);

router.get("/verify/:token", verifyEmail);

router.get("/verify-email", verifyEmail);

router.get("/dev/get-verify-token", devGetVerifyToken);

router.post("/send-phone-otp", sendPhoneOtp);
router.post("/verify-phone-otp", verifyPhoneOtp);

router.post("/login", login);

// Protected
router.get("/get-me", protect, getMe);


export default router;
