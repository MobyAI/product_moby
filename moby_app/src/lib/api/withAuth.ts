import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/firebase/admin/auth/verifySession";

interface AuthenticatedRequest extends NextRequest {
  user: {
    uid: string;
    email?: string;
    accessLevel?: "no_access" | "beta" | "paid" | "expired";
    betaExpiresAt?: number;
    admin?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
) => Promise<NextResponse> | NextResponse;

interface WithAuthOptions {
  requireAccess?: boolean; // Default true
  adminOnly?: boolean; // Default false
}

export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
) {
  const { requireAccess = true, adminOnly = false } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any) => {
    try {
      // Verify session exists
      const decodedClaims = await verifySession();

      if (!decodedClaims) {
        return NextResponse.json(
          { error: "Unauthorized - Invalid or missing session" },
          { status: 401 }
        );
      }

      // Check admin-only routes
      if (adminOnly && !decodedClaims.admin) {
        return NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        );
      }

      // Check access level if required (default behavior)
      if (requireAccess && !decodedClaims.admin) {
        const { accessLevel, betaExpiresAt } = decodedClaims;

        // Check for active access
        const hasActiveAccess =
          accessLevel === "paid" ||
          (accessLevel === "beta" &&
            betaExpiresAt &&
            Date.now() < betaExpiresAt);

        if (!hasActiveAccess) {
          // Provide helpful error based on status
          let message = "Subscription required";

          if (
            accessLevel === "beta" &&
            betaExpiresAt &&
            Date.now() >= betaExpiresAt
          ) {
            message = "Beta access expired";
          } else if (accessLevel === "no_access" || !accessLevel) {
            message = "No active subscription";
          }

          return NextResponse.json(
            {
              error: message,
              code: "SUBSCRIPTION_REQUIRED",
              accessLevel,
            },
            { status: 403 }
          );
        }
      }

      // Add user info to request
      (req as AuthenticatedRequest).user = decodedClaims;

      // Call the actual handler
      return handler(req as AuthenticatedRequest, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
  };
}
