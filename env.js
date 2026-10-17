import "dotenv/config";

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
];

const missingEnv = requiredEnv.filter(
  (key) => !process.env[key]
);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES_IN || "365d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  apiUrl: process.env.API_URL || process.env.BACKEND_URL || "http://localhost:5000",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  tavilyApiKey: process.env.TAVILY_API_KEY,
  tavilySearchDepth: process.env.TAVILY_SEARCH_DEPTH || "advanced",
  tavilyMaxResults: Number(process.env.TAVILY_MAX_RESULTS) || 5,

  emailService: process.env.EMAIL_SERVICE || process.env.MAIL_SERVICE || "gmail",
  // Support the GOOGLE_* names already used by existing deployments as well as
  // the EMAIL_* names documented for new deployments.
  emailUser: process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.GOOGLE_USER || process.env.MAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.GOOGLE_APP_PASSWORD || process.env.MAIL_PASSWORD || "",
  emailClientId: process.env.EMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
  emailClientSecret: process.env.EMAIL_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
  emailRefreshToken: process.env.EMAIL_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || "",
  emailForceGmail: String(process.env.EMAIL_FORCE_GMAIL || "false").toLowerCase() === "true",

  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 5,
};
