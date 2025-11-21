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
      subject: "Welcome to the Team",
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
            .button:hover { 
                background-color: #a34a3d !important; 
                color: #FFFFFF !important; 
                border-color: #a34a3d !important 
            }
            </style>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; height: 100%; margin: 0; line-height: 1.4; color: #000000; background-color: #FFFFFF; -webkit-text-size-adjust: none; width: 100% !important;">
            <span class="preheader" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; display: none !important;">Welcome to Odee - Your AI scene partner awaits!</span>
            
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
                                Welcome to Odee!
                            </h1>
                            
                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                Hi ${firstName || "there"} 👋
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                Thanks for joining Odee! We're excited to have you here and to help take your acting career to the next level.
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                <strong style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">Here's what you can do with our platform:</strong>
                            </p>

                            <!-- Features as styled paragraphs (Render style) -->
                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                • <strong style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">Upload any script</strong> and let our smart parsing technology automatically prepare it for practice on our platform.
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                • <strong style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">Control every detail</strong> of each line when practicing by clicking to edit. Add emotion/action tags "[tag: sighs]".
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                • <strong style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">Practice with your very own AI scene partner</strong> that delivers lines consistently every single time with your voice selections.
                            </p>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                • <strong style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">Track all your auditions</strong> in one organized dashboard and never miss an opportunity to shine.
                            </p>

                            <!-- CTA Button -->
                            <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin: 50px auto; padding: 0; -premailer-width: 100%; -premailer-cellpadding: 0; -premailer-cellspacing: 0; text-align: center;">
                                <tr>
                                <td align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                    <tr>
                                        <td align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box;">
                                        <a href="https://odee.io/login" class="button" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; border-radius: 3px; color: #FFFFFF; display: inline-block; text-decoration: none; background-color: #c45c4c; border: solid 1px #c45c4c; border-top: 10px solid #c45c4c; border-right: 18px solid #c45c4c; border-bottom: 10px solid #c45c4c; border-left: 18px solid #c45c4c; font-weight: bold;">
                                            Start Rehearsing Now
                                        </a>
                                        </td>
                                    </tr>
                                    </table>
                                </td>
                                </tr>
                            </table>

                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                Need help getting started? Just reply to this email – we're here to help!
                            </p>
                            
                            <p style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: left; color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 15px;">
                                - The Odee Team
                            </p>

                            <!-- Footer in Sub copy style -->
                            <table width="100%" class="body-sub" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; margin-top: 25px; padding-top: 25px; border-top: 1px solid #EDEFF2;">
                                <tr>
                                <td class="content-cell" align="center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; padding: 10px 0;">
                                    <p class="sub align-center" style="font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif; box-sizing: border-box; line-height: 1.5em; text-align: center; color: #74787E; font-size: 12px; margin-top: 0; margin-bottom: 15px;">
                                    Sent to ${userRecord.email}
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
