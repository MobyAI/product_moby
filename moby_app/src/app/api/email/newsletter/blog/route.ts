import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiting
const signups = new Map<string, number[]>();

export async function POST(request: Request) {
  try {
    const { email, website } = await request.json();

    // Honeypot check - if "website" field is filled, it's a bot
    if (website) {
      console.log("🤖 Bot detected via honeypot");
      // Return fake success to not tip off the bot
      return NextResponse.json({
        success: true,
        message: "Successfully subscribed!",
      });
    }

    // Rate limiting by IP
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const recentSignups = signups.get(ip) || [];
    const validSignups = recentSignups.filter((time) => now - time < oneHour);

    // Max 3 signups per hour per IP
    if (validSignups.length >= 3) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    validSignups.push(now);
    signups.set(ip, validSignups);

    // Validate email
    if (!email || !email.includes("@") || email.length < 5) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID_BLOG;

    if (!audienceId) {
      throw new Error("RESEND_AUDIENCE_ID_BLOG not configured");
    }

    // Add contact to audience
    const { error } = await resend.contacts.create({
      email: email,
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error("Resend error:", error);

      if (error.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "This email is already subscribed" },
          { status: 400 }
        );
      }

      throw error;
    }

    // Send welcome email
    await resend.emails.send({
      from: "Odee <newsletter@odee.io>",
      to: email,
      subject: "Welcome to the Odee Blog!",
      html: `
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
            </style>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; height: 100%; margin: 0; line-height: 1.4; color: #000000; background-color: #FFFFFF; -webkit-text-size-adjust: none; width: 100% !important;">
            <span class="preheader" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; display: none !important;">Thanks for subscribing to the Odee blog!</span>
            
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
                        <!-- Body content -->
                        <tr>
                            <td class="content-cell" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; padding: 35px;">
                            
                            <h1 style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin-top: 0; color: #000000; font-size: 19px; font-weight: bold; text-align: left; margin-bottom: 15px;">
                                Welcome to our Blog
                            </h1>
                            
                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                Thanks for subscribing! 📨
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                You'll now receive the latest acting tips, techniques, and insights delivered straight to your inbox. We share practical advice to help you level up your craft and book more roles.
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                No spam, just valuable content for actors.
                            </p>

                            <!-- Tip box with original styling -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin-top: 50px; margin-bottom: 50px;">
                                <tr>
                                <td style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; padding: 24px; background-color: #eeede4; border-radius: 8px; border-left: 4px solid #c45c4c;">
                                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                                    💡 <strong style="color: #4a4a4a;">Pro tip:</strong> Add newsletter@odee.io to your contacts so our emails don't end up in spam.
                                    </p>
                                </td>
                                </tr>
                            </table>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                Happy reading!
                            </p>
                            
                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                - The Odee Team
                            </p>

                            <!-- Footer in Sub copy style -->
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
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
