"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          background: "linear-gradient(to top right, #B2B5E0, #C5ADC5)",
          backgroundAttachment: "fixed",
          height: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
            maxWidth: "400px",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "#1a1a1a",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginBottom: "1.5rem",
              color: "#666",
              fontSize: "0.95rem",
            }}
          >
            {
              "We encountered an unexpected error. The issue has been reported and we'll look into it."
            }
          </p>
          <button
            onClick={() => reset()}
            className="bg-black text-white py-3 px-8 rounded-md text-base cursor-pointer transition-colors hover:opacity-80"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
