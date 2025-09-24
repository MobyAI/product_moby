import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/firebase/admin/auth/verifySession';

interface AuthenticatedRequest extends NextRequest {
    user: {
        uid: string;
        email?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    };
}

type AuthenticatedHandler = (
    req: AuthenticatedRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: any
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthenticatedHandler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: NextRequest, context?: any) => {
        try {
            // Use your existing verifySession function
            const decodedClaims = await verifySession();

            if (!decodedClaims) {
                return NextResponse.json(
                    { error: 'Unauthorized - Invalid or missing session' },
                    { status: 401 }
                );
            }

            // Add user info to request
            (req as AuthenticatedRequest).user = decodedClaims;

            // Call the actual handler with authenticated request
            return handler(req as AuthenticatedRequest, context);
        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json(
                { error: 'Authentication failed' },
                { status: 401 }
            );
        }
    };
}