import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: ['/scripts/:path*'],
};

export function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    // If there’s no Firebase session cookie, block/redirect
    const session = req.cookies.get('__session')?.value;
    if (!session) {
        // API requests → 401; pages → redirect to /login?next=<original>
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('MIDDLEWARE: No session cookie found!');
        const url = new URL('/login', req.url);
        url.searchParams.set('next', pathname + search);
        return NextResponse.redirect(url);
    }
    console.log('MIDDLEWARE: Session cookie found!');

    // Cookie exists → allow
    return NextResponse.next();
}