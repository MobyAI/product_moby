"use client";

import { useEffect, useState } from "react";

interface BetaAccessBannerProps {
  betaExpiresAt?: number; // timestamp in milliseconds
  accessLevel?: "no_access" | "beta" | "paid" | "expired";
}

const upgradeEmailUrl = `mailto:try.tableread@gmail.com?subject=${encodeURIComponent(
  "Upgrade to Full Access"
)}&body=${encodeURIComponent(
  `Hi,

I'd like to upgrade my beta access to a paid subscription.

Thank you!`
)}`;

export default function BetaAccessBanner({
  betaExpiresAt,
  accessLevel,
}: BetaAccessBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    if (accessLevel !== "beta" || !betaExpiresAt) return;

    const updateTimeLeft = () => {
      const now = Date.now();
      const diff = betaExpiresAt - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setDaysLeft(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      setDaysLeft(days);

      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? "s" : ""} left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours !== 1 ? "s" : ""} left`);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${minutes} minute${minutes !== 1 ? "s" : ""} left`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [betaExpiresAt, accessLevel]);

  // Only show if user has beta access
  if (accessLevel !== "beta") return null;

  return (
    <div className="absolute top-4 left-4 z-50 w-6/20 flex items-center justify-between text-sm bg-[#f5d76e] rounded-lg px-4 py-2 shadow-md">
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary-dark-alt text-white font-medium text-sm">
          BETA
        </span>
        <span className="text-gray-700">
          {timeLeft && (
            <>
              {daysLeft <= 5
                ? `${timeLeft}! Continue usage?`
                : `${timeLeft} in your trial`}
            </>
          )}
        </span>
      </div>
      <a
        href={upgradeEmailUrl}
        className="text-gray-600 hover:text-gray-900 underline"
      >
        Upgrade Access! 🥳
      </a>
    </div>
  );
}
