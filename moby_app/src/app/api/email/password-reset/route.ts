import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth } from "@/lib/firebase/admin/config/app";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const resend = new Resend(process.env.RESEND_API_KEY);

// Create Redis instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiters
// Per IP: 3 requests per 15 minutes
const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
  prefix: "ratelimit:password-reset:ip",
});

// Per email: 2 requests per hour
const emailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "ratelimit:password-reset:email",
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length < 255;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Get IP address for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Check IP rate limit
    const ipResult = await ipRateLimit.limit(ip);
    if (!ipResult.success) {
      const retryAfter = Math.ceil((ipResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many password reset attempts. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // Check email rate limit
    const emailResult = await emailRateLimit.limit(email.toLowerCase());
    if (!emailResult.success) {
      const retryAfter = Math.ceil((emailResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error:
            "Too many password reset requests for this email. Please try again later.",
          retryAfter,
          remaining: emailResult.remaining,
          limit: emailResult.limit,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // Generate password reset link using Firebase Admin SDK
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `https://odee.io/action`,
    });

    // Send email via Resend
    await resend.emails.send({
      from: "Odee <hello@odee.io>",
      to: email,
      subject: "Reset your password",
      html: getPasswordResetEmailTemplate(resetLink, email),
    });

    // Log for monitoring (with masked email)
    console.log({
      event: "password_reset_sent",
      email: email.replace(/(?<=.{2}).*(?=@)/, "***"),
      ip,
      timestamp: new Date().toISOString(),
    });

    // IMPORTANT: Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      remaining: emailResult.remaining,
    });
  } catch (error: any) {
    console.error("Password reset error:", error);

    // Handle Firebase rate limit
    if (
      error.code === "auth/too-many-requests" ||
      error.message?.includes("TOO_MANY_ATTEMPTS_TRY_LATER")
    ) {
      const retryAfter = 3600; // 1 hour

      return NextResponse.json(
        {
          error: "Too many password reset requests. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // For security: Don't reveal if user exists or not
    // Always return success to prevent enumeration attacks
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({ success: true });
    }

    // Only return error for actual server failures
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

function getPasswordResetEmailTemplate(resetLink: string, email: string) {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title></title>
        <style type="text/css" rel="stylesheet" media="all">
        @media only screen and (max-width: 600px) { 
            .email-body_inner, .email-footer { width: 100% !important } 
        }
        @media only screen and (max-width: 500px) { 
            .button { width: 100% !important } 
        }
        .button:hover { 
            background-color: #a34a3d !important; 
            color: #FFFFFF !important; 
            border-color: #a34a3d !important 
        }
        </style>
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; height: 100%; margin: 0; line-height: 1.4; color: #000000; background-color: #FFFFFF; -webkit-text-size-adjust: none; width: 100% !important;">
        <span class="preheader" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; display: none !important;">Reset your Odee password</span>
        
        <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; width: 100%; margin: 0; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0;">
        <tr>
            <td align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
            <table class="email-masthead" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; width: 100%; margin: 0; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0; text-align: center;">
                <tr>
                <td class="email-masthead" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; width: 100%; margin: 0; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0; text-align: center;">
                    <a href="https://odee.io/" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; color: #c45c4c; font-weight: bold;">
                    <img src="https://odee.io/email-banner.png" alt="Odee" style="width: 100%; max-width: 570px; height: auto; font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; border: none;">
                    </a>
                </td>
                </tr>
                
                <!-- Email Body -->
                <tr>
                <td class="email-body" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; width: 100%; margin: 0; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0; border-bottom: 1px solid #EDEFF2; background-color: #FFFFFF;">
                    <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; width: 570px; margin: 0 auto; padding: 0; -premailer-width: 570px; -premailer-cellpadding: 0; -premailer-cellspacing: 0; background-color: #FFFFFF;">
                    <tr>
                        <td class="content-cell" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; padding: 35px;">
                        
                        <h1 style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin-top: 0; color: #000000; font-size: 19px; font-weight: bold; text-align: left; margin-bottom: 15px;">
                            Reset your password
                        </h1>
                        
                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                            Hello,
                        </p>

                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                            We received a request to reset the password for your Odee account associated with ${email}.
                        </p>

                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                            Click the button below to reset your password:
                        </p>

                        <!-- CTA Button -->
                        <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin: 40px auto; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0; text-align: center;">
                            <tr>
                            <td align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                <tr>
                                    <td align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                    <a href="${resetLink}" class="button" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; border-radius: 3px; color: #FFFFFF; display: inline-block; text-decoration: none; background-color: #c45c4c; border: solid 1px #c45c4c; border-top: 10px solid #c45c4c; border-right: 18px solid #c45c4c; border-bottom: 10px solid #c45c4c; border-left: 18px solid #c45c4c; font-weight: bold;">
                                        Reset Password
                                    </a>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                        </table>

                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                        </p>

                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                            This link will expire in 1 hour.
                        </p>
                        
                        <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 15px; margin-bottom: 15px;">
                            - The Odee Team
                        </p>

                        <!-- Footer -->
                        <table width="100%" class="body-sub" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin-top: 25px; padding-top: 25px; border-top: 1px solid #EDEFF2;">
                            <tr>
                            <td class="content-cell" align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; padding: 10px 0;">
                                <p class="sub align-center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: center; color: #74787E; font-size: 12px; margin-top: 0; margin-bottom: 15px;">
                                Sent to ${email}
                                </p>
                                <p class="sub align-center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: center; color: #74787E; font-size: 12px; margin-top: 0; margin-bottom: 0;">
                                © 2025 Odee. All rights reserved.
                                </p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>
            </table>
            </td>
        </tr>
        </table>
    </body>
    </html>
  `;
}
