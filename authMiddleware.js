import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ------------------------------------------
    // Authorization header check
    // ------------------------------------------

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ------------------------------------------
    // Bearer format check
    // ------------------------------------------

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    // ------------------------------------------
    // Extract token
    // ------------------------------------------

    const token = authHeader
      .slice(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required.",
      });
    }

    // ------------------------------------------
    // Verify JWT
    // ------------------------------------------

    const decoded = jwt.verify(
      token,
      env.jwtSecret
    );

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload.",
      });
    }

    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type.",
      });
    }

    // ------------------------------------------
    // Find user
    // ------------------------------------------

    const user = await User.findById(
      decoded.id
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // ------------------------------------------
    // Email verification check
    // ------------------------------------------

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email is not verified.",
      });
    }

    // ------------------------------------------
    // Attach user to request
    // ------------------------------------------

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "❌ AUTH MIDDLEWARE ERROR:",
      error.message
    );

    // ------------------------------------------
    // JWT expired
    // ------------------------------------------

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired.",
      });
    }

    // ------------------------------------------
    // Invalid JWT
    // ------------------------------------------

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token.",
      });
    }

    // ------------------------------------------
    // Other errors
    // ------------------------------------------

    next(error);
  }
};

// ------------------------------------------
// Primary middleware name
// ------------------------------------------

export const protect = authenticateUser;

// ------------------------------------------
// Existing AI routes compatibility
// ------------------------------------------

export const requireAuth = authenticateUser;
