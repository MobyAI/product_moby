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
        message: "You're on the list!",
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

    const audienceId = process.env.RESEND_AUDIENCE_ID_LAUNCH;

    if (!audienceId) {
      throw new Error("RESEND_AUDIENCE_ID_LAUNCH not configured");
    }

    // Add contact to launch audience
    const { error } = await resend.contacts.create({
      email: email,
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error("Resend error:", error);

      if (error.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "You're already on the list!" },
          { status: 400 }
        );
      }

      throw error;
    }

    // Send confirmation email
    await resend.emails.send({
      from: "newsletter@odee.io",
      to: email,
      subject: "You're on the list for Odee's launch! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #eeede4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eeede4; padding: 40px 20px;">
            <tr>
              <td align="center">
                
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(196, 92, 76, 0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #c45c4c; padding: 48px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: 500; letter-spacing: -1px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase;">
                        Welcome to our Launch List
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 48px 40px;">
                      <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.8; color: #1a1a1a;">
                        Thanks for signing up! 🤩
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                        You're now on the inside track for everything Odee. We'll keep you posted on all updates, added features, and news leading up to our official launch.
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                        No spam, no fluff. Just the updates that matter.
                      </p>
                      
                      <!-- Simple divider -->
                      <div style="margin: 40px 0; padding: 24px; background-color: #eeede4; border-radius: 8px; border-left: 4px solid #c45c4c;">
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                          💡 <strong style="color: #c45c4c;">Pro tip:</strong> Add hello@odee.io to your contacts so our emails don't end up in spam.
                        </p>
                      </div>
                      
                      <p style="margin: 32px 0 0 0; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                        We're so excited to have you here. Talk soon!
                      </p>
                      
                      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.8; color: #1a1a1a;">
                        — The Odee Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 32px 40px; background-color: #ffffff; border-top: 1px solid #d5d4ca;">
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6a6a5a; text-align: center;">
                        Sent to ${email}
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
                <table width="600" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 24px; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #959474;">
                        © 2025 Odee
                      </p>
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
      message: "You're on the list!",
    });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
