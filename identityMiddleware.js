import { protect } from "./authMiddleware.js";

const GUEST_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export const identifyRequest = (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }

  const guestId = String(req.headers["x-guest-id"] || "").trim();

  if (!GUEST_ID_PATTERN.test(guestId)) {
    return res.status(400).json({
      success: false,
      message: "A valid guest session is required.",
    });
  }

  req.guestId = guestId;
  return next();
};
