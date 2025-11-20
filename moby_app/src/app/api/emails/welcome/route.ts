import { NextResponse } from "next/server";
import { Resend } from "resend";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin/config/app";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const userRecord = await adminAuth.getUser(decodedClaims.uid);

    const { firstName } = await request.json();

    if (!userRecord.email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Send welcome email
    await resend.emails.send({
      from: "Odee <hello@odee.io>",
      to: userRecord.email,
      subject: "Welcome to Odee",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
            <tr>
            <td align="center">
                
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(45, 55, 72, 0.08);">
                
                <!-- Header -->
                <tr>
                    <td style="background-color: #c45c4c; padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: 500; letter-spacing: -1px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase;">
                        Welcome to Odee!
                    </h1>
                    </td>
                </tr>
                
                <!-- Body -->
                <tr>
                    <td style="background-color: #eeede4; padding: 48px 40px;">
                    
                    <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.8; color: #1a1a1a;">
                        Hi ${firstName || "there"}! 👋
                    </p>
                    
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                        Thanks for joining Odee! We're excited to have you here and to help take your acting career to the next level.
                    </p>
                    
                    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.8; color: #4a4a4a; font-weight: 600;">
                        Here's what you can do with our platform:
                    </p>
                    
                    <!-- Feature list -->
                    <div style="margin: 0 0 32px 0;">
                        <div style="margin: 0 0 16px 0; padding-left: 24px; position: relative;">
                        <span style="position: absolute; left: 0; top: 0; color: #48bb78; font-weight: bold;">✓</span>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                            <strong style="color: #4a4a4a;">Upload any script</strong> and let our smart parsing technology automatically prepare it for practice on our platform
                        </p>
                        </div>
                        
                        <div style="margin: 0 0 16px 0; padding-left: 24px; position: relative;">
                        <span style="position: absolute; left: 0; top: 0; color: #48bb78; font-weight: bold;">✓</span>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                            <strong style="color: #4a4a4a;">Control every detail</strong> of individual lines in the practice room by clicking to edit. Add emotion/action tags "[tag: sighs]", and custom pauses.
                        </p>
                        </div>
                        
                        <div style="margin: 0 0 16px 0; padding-left: 24px; position: relative;">
                        <span style="position: absolute; left: 0; top: 0; color: #48bb78; font-weight: bold;">✓</span>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                            <strong style="color: #4a4a4a;">Practice with your very own AI scene partner</strong> that delivers lines consistently every single time with your voice selections
                        </p>
                        </div>
                        
                        <div style="margin: 0 0 16px 0; padding-left: 24px; position: relative;">
                        <span style="position: absolute; left: 0; top: 0; color: #48bb78; font-weight: bold;">✓</span>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                            <strong style="color: #4a4a4a;">Track all your auditions</strong> in one organized dashboard and never miss an opportunity to shine
                        </p>
                        </div>
                    </div>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                        <tr>
                        <td align="center">
                            <a href="https://odee.io/login" style="display: inline-block; background-color: #c45c4c; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                            Start Rehearsing Now
                            </a>
                        </td>
                        </tr>
                    </table>
                    
                    <!-- Tip box -->
                    <div style="margin: 40px 0 32px 0; padding: 24px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #c45c4c;">
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                        💡 <strong style="color: #4a4a4a;">Quick tip:</strong> Start with a short scene you know well. This helps you get comfortable with the AI scene partner before tackling new material.
                        </p>
                    </div>
                    
                    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                        Need help getting started? Just reply to this email – we're here to help!
                    </p>
                    
                    <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 1.8; color: #1a1a1a;">
                        — The Odee Team
                    </p>
                    </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                    <td style="padding: 32px 40px; background-color: #eeede4;">
                    <!-- Logo -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                        <tr>
                        <td align="center">
                            <img src="https://odee.io/icon.png" alt="Odee Logo" width="50" height="50" style="display: block; margin: 0 auto; opacity: 0.8;" />
                        </td>
                        </tr>
                    </table>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #4a4a4a; text-align: center;">
                        Sent to ${userRecord.email}
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #4a4a4a; text-align: center;">
                        <a href="https://odee.io/profile" style="color: #4a4a4a; text-decoration: underline;">Manage preferences</a>
                    </p>
                    </td>
                </tr>
                
                </table>
                
                <!-- Legal footer -->
                <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #718096;">
                        © 2025 Odee. All rights reserved.
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
      message: "Welcome email sent!",
    });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
