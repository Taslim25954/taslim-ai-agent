
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { sendVerificationEmail } from "../services/emailService.js";

const normalizePhoneNumber = (value) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
};

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const createEmailVerificationToken = (userId) =>
  jwt.sign(
    {
      id: userId.toString(),
      type: "email-verification",
    },
    env.jwtSecret,
    { expiresIn: "1d" }
  );

const sendSmsOtp = async (phoneNumber, otp) => {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) {
    if (env.nodeEnv !== "production") {
      return {
        success: true,
        devOtp: otp,
        mode: "dev-fallback",
      };
    }

    throw new Error("Twilio SMS configuration is missing.");
  }

  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  const message = await client.messages.create({
    body: `Your verification code is ${otp}. It expires in ${env.otpExpiresMinutes || 5} minutes.`,
    from: env.twilioPhoneNumber,
    to: phoneNumber,
  });

  return {
    success: true,
    sid: message.sid,
    mode: "twilio",
  };
};

// ===============================
// REGISTER
// ===============================
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      isVerified: false,
    });

    // ===============================
    // CREATE EMAIL VERIFICATION TOKEN
    // ===============================
    const verificationToken = createEmailVerificationToken(user._id);

    // ===============================
    // SEND VERIFICATION EMAIL
    // ===============================
    let emailResponse;
    try {
      emailResponse = await sendVerificationEmail(
        user.email,
        verificationToken
      );
    } catch (emailError) {
      console.error(
        "❌ Verification email failed:",
        emailError.message
      );

      return res.status(502).json({
        success: false,
        message:
          "User registered, but the verification email could not be delivered. Check the email provider configuration and try again.",
      });
    }

    const response = {
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
    };

    if (env.nodeEnv !== "production") {
      response.devToken = verificationToken;
    }

    if (emailResponse?.previewUrl) {
      response.devEmailPreviewUrl = emailResponse.previewUrl;
    }

    return res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

// ===============================
// VERIFY EMAIL
// ===============================
export const verifyEmail = async (req, res, next) => {
  try {
    // Supports both:
    // /verify/:token
    // /verify-email?token=xxxxx

    const token = req.params.token || req.query.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    // Verify JWT
    const payload = jwt.verify(
      token,
      env.jwtSecret
    );

    // Check token type
    if (payload.type !== "email-verification") {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    // Find user
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Already verified
    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
      });
    }

    // Verify user
    user.isVerified = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        message: "Verification token has expired",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    next(err);
  }
};

// ===============================
// LOGIN
// ===============================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      // Registration may have happened before mail settings were corrected.
      // Send a fresh link when that user tries to sign in, so they are not
      // permanently locked out waiting for an old or undelivered message.
      try {
        const verificationToken = createEmailVerificationToken(user._id);
        await sendVerificationEmail(user.email, verificationToken);
      } catch (emailError) {
        console.error("Verification email resend failed:", emailError.message);
      }

      return res.status(403).json({
        success: false,
        message: "Please verify your email before login. A new verification link has been sent to your email address.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        type: "access",
      },
      env.jwtSecret,
      {
        expiresIn: env.jwtExpires || "30d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ===============================
// DEV: GET VERIFICATION TOKEN
// ===============================
export const devGetVerifyToken = async (
  req,
  res,
  next
) => {
  try {
    if (env.nodeEnv === "production") {
      return res.status(403).json({
        success: false,
        message: "Forbidden in production",
      });
    }

    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const verificationToken = createEmailVerificationToken(user._id);

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        verificationToken,
        verificationUrl:
          `${env.clientUrl || "http://localhost:5000"}` +
          `/api/v1/auth/verify-email?token=${verificationToken}`,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};


export const sendPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber, email } = req.body || {};

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    let user = null;

    if (email) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    }

    if (!user) {
      user = await User.findOne({ phoneNumber: normalizedPhone });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Register first or provide a valid phone number.",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + (env.otpExpiresMinutes || 5) * 60 * 1000);

    user.phoneNumber = normalizedPhone;
    user.phoneOtpHash = await bcrypt.hash(otp, 10);
    user.phoneOtpExpiresAt = expiresAt;
    user.isPhoneVerified = false;

    await user.save();

    try {
      const smsResult = await sendSmsOtp(normalizedPhone, otp);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        phoneNumber: normalizedPhone,
        ...(smsResult?.devOtp ? { devOtp: smsResult.devOtp } : {}),
      });
    } catch (smsError) {
      console.error("❌ SMS OTP send failed:", smsError.message);

      if (env.nodeEnv === "production") {
        return res.status(500).json({
          success: false,
          message: "SMS could not be delivered. Please try again later.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "OTP generated in development mode",
        phoneNumber: normalizedPhone,
        devOtp: otp,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phoneNumber, otp, email } = req.body || {};

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    let user = null;

    if (email) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    }

    if (!user) {
      user = await User.findOne({ phoneNumber: normalizedPhone });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP was requested for this phone number",
      });
    }

    if (new Date(user.phoneOtpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const matches = await bcrypt.compare(String(otp).trim(), user.phoneOtpHash);

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isPhoneVerified = true;
    user.phoneOtpHash = "";
    user.phoneOtpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
      phoneNumber: normalizedPhone,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          isPhoneVerified: user.isPhoneVerified,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
