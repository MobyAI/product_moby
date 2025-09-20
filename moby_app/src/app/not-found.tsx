import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8 bg-white/90 rounded-xl shadow-lg max-w-lg">
                <h2 className="text-header-2 font-bold mb-4">Page not found</h2>
                <p className="text-gray-600 mb-6">
                    {"Sorry we couldn't find the page you're looking for."}
                </p>
                <Link
                    href="/tracker"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                >
                    <Home size={20} />
                    Go home
                </Link>
            </div>
        </div>
    );
}