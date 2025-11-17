import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!audienceId) {
      throw new Error("RESEND_AUDIENCE_ID not configured");
    }

    // Add contact to audience
    const { data, error } = await resend.contacts.create({
      email: email,
      unsubscribed: false,
      audienceId: audienceId,
    });

    if (error) {
      console.error("Resend error:", error);

      // Check if email already exists
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
      from: "onboarding@resend.dev", // Change to your verified domain later
      to: email,
      subject: "Welcome to the odee Blog!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Thanks for subscribing!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            You'll now receive the latest acting tips and insights delivered straight to your inbox.
          </p>
          <p style="font-size: 16px; color: #333;">- The odee Team</p>
        </div>
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
