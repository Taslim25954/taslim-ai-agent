

import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let cachedTransporter = null;

// ==========================================
// CREATE EMAIL TRANSPORTER
// ==========================================

const createTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const {
    emailUser,
    emailPassword,
    emailClientId,
    emailClientSecret,
    emailRefreshToken,
    emailForceGmail,
  } = env;

  const hasConfiguredEmailService = Boolean(
    emailUser &&
    (
      emailPassword ||
      (emailClientId && emailClientSecret && emailRefreshToken)
    )
  );

  // Use Ethereal only when no real email account has been configured. Previously
  // every non-production environment used Ethereal, even when Gmail credentials
  // were present, so verification messages could never reach a user's inbox.
  if (
    env.nodeEnv !== "production" &&
    !emailForceGmail &&
    !hasConfiguredEmailService
  ) {
    console.log(
      "⚠️ Development mode detected: using Ethereal preview email."
    );

    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log("⚠️ Using Ethereal email preview account");
    return cachedTransporter;
  }

  // ==========================================
  // GMAIL APP PASSWORD
  // ==========================================

  // Prefer an App Password when available. A revoked OAuth refresh token
  // must not prevent Gmail delivery when SMTP credentials are valid.
  if (emailUser && emailPassword) {
    console.log("📧 Creating Gmail password transporter...");

    cachedTransporter = nodemailer.createTransport({
      service: env.emailService || "gmail",

      auth: {
        user: emailUser,
        // Google displays App Passwords in groups of four characters. Remove
        // copied spaces so the SMTP login always receives the 16-character key.
        pass: emailPassword.replace(/\s/g, ""),
      },
    });
  }

  // ==========================================
  // GMAIL OAUTH2 FALLBACK
  // ==========================================

  else if (
    emailUser &&
    emailClientId &&
    emailClientSecret &&
    emailRefreshToken
  ) {
    console.log("📧 Creating Gmail OAuth2 transporter...");
    console.log("📧 Gmail user:", emailUser);

    cachedTransporter = nodemailer.createTransport({
      service: "gmail",

      auth: {
        type: "OAuth2",

        user: emailUser,

        clientId: emailClientId,

        clientSecret: emailClientSecret,

        refreshToken: emailRefreshToken,
      },
    });
  }

  // ==========================================
  // PRODUCTION CONFIG MISSING
  // ==========================================

  else {
    throw new Error(
      "Email configuration is missing"
    );
  }

  // ==========================================
  // VERIFY TRANSPORTER
  // ==========================================

  try {
    await cachedTransporter.verify();

    console.log(
      "✅ Email transporter verified successfully"
    );

    return cachedTransporter;
  } catch (error) {
    console.error(
      "❌ Email transporter verification failed:"
    );
    console.error(error.message);

    cachedTransporter = null;

    // Do not silently replace a configured real SMTP service with Ethereal.
    // Ethereal accepts the message but never delivers it to the user's inbox,
    // which made registration appear successful when Gmail authentication failed.
    if (env.nodeEnv !== "production" && !hasConfiguredEmailService) {
      console.warn(
        "⚠️ Falling back to Ethereal email preview because Gmail auth failed."
      );

      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      await cachedTransporter.verify();
      console.log(
        "✅ Fallback Ethereal transporter verified successfully"
      );
      console.log(
        "⚠️ Ethereal preview user:",
        testAccount.user
      );
      console.log(
        "⚠️ Ethereal preview pass:",
        testAccount.pass
      );

      return cachedTransporter;
    }

    throw new Error(
      `Email authentication failed: ${error.message}`
    );
  }
};

// ==========================================
// SEND VERIFICATION EMAIL
// ==========================================

export const sendVerificationEmail = async (
  email,
  verificationToken
) => {
  const transporter =
    await createTransporter();

  // ==========================================
  // VERIFICATION URL
  // ==========================================

  const verifyUrl =
    `${env.apiUrl || "http://localhost:5000"}` +
    `/api/v1/auth/verify-email?token=` +
    encodeURIComponent(
      verificationToken
    );

  console.log(
    "=========================================="
  );

  // ==========================================
  // MAIL
  // ==========================================

  const mailOptions = {
    from:
      `"Taslim AI Agent" <${env.emailUser}>`,

    to: email,

    subject:
      "Verify your email - Taslim AI Agent",

    html: `
      <!DOCTYPE html>

      <html>

        <head>
          <meta charset="UTF-8" />

          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <title>
            Verify your email
          </title>

          <style>
            @media only screen and (max-width: 600px) {
              .email-container {
                margin: 16px auto !important;
                padding: 24px !important;
              }
            }
          </style>
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f4f4f4;
            font-family:Arial,sans-serif;
          "
        >

          <div
            class="email-container"
            style="
              width:100%;
              max-width:600px;
              box-sizing:border-box;
              margin:40px auto;
              background:#ffffff;
              padding:40px;
              border-radius:12px;
            "
          >

            <h1
              style="
                color:#111827;
              "
            >
              Verify your email
            </h1>

            <p
              style="
                color:#4b5563;
                font-size:16px;
              "
            >
              Thanks for creating an account with
              <strong>Taslim AI Agent</strong>.
            </p>

            <p
              style="
                color:#4b5563;
                font-size:16px;
              "
            >
              Please click the button below
              to verify your email address.
            </p>

            <div
              style="
                margin:30px 0;
              "
            >

              <a
                href="${verifyUrl}"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  background:#111827;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:bold;
                "
              >
                Verify Email
              </a>

            </div>

            <p
              style="
                color:#6b7280;
                font-size:13px;
              "
            >
              This verification link will
              expire in 24 hours.
            </p>

            <p
              style="
                color:#9ca3af;
                font-size:12px;
                word-break:break-all;
              "
            >
              If the button does not work,
              copy and paste this URL:
            </p>

            <p
              style="
                color:#6b7280;
                font-size:12px;
                word-break:break-all;
              "
            >
              ${verifyUrl}
            </p>

          </div>

        </body>

      </html>
    `,
  };

  // ==========================================
  // SEND
  // ==========================================

  const result =
    await transporter.sendMail(
      mailOptions
    );

  const previewUrl =
    nodemailer.getTestMessageUrl(
      result
    );

  if (previewUrl) {
    console.log(
      "🔗 Ethereal preview URL:",
      previewUrl
    );
  }

  console.log(
    "✅ Verification email sent successfully"
  );

  console.log(
    "📨 Message ID:",
    result.messageId
  );

  return { ...result, previewUrl };
};

