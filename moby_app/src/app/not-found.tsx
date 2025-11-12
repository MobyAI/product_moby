"use client";

import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white/90 rounded-xl shadow-lg max-w-lg">
        <h2 className="text-header-2 font-bold mb-4">Page not found</h2>
        <p className="text-gray-600 mb-6">
          {"Sorry we couldn't find the page you're looking for."}
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full hover:opacity-80 transition-opacity duration-200"
        >
          <Undo2 size={20} />
          Go back
        </button>
      </div>
    </div>
  );
}
