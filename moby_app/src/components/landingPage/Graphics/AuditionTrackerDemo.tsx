"use client";

import React, { useState } from "react";
import { Calendar } from "lucide-react";

const sampleAuditions = [
  {
    id: 1,
    date: "2025-01-15",
    project: "Breaking Point",
    status: "callback",
  },
  {
    id: 2,
    date: "2025-03-12",
    project: "The Last Stand",
    status: "submitted",
  },
  {
    id: 3,
    date: "2025-4-08",
    project: "Midnight Runner",
    status: "booked",
  },
];

const statusConfig = {
  submitted: {
    label: "Submitted",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    borderColor: "border border-gray-800",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border border-purple-800",
  },
  declined: {
    label: "Declined",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border border-red-800",
  },
  callback: {
    label: "Callback",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border border-blue-800",
  },
  hold: {
    label: "Hold",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border border-yellow-800",
  },
  booked: {
    label: "Booked",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border border-green-800",
  },
};

export default function AuditionTrackerDemo() {
  const [auditions, setAuditions] = useState(sampleAuditions);

  const handleStatusClick = (id: number) => {
    setAuditions((prev) =>
      prev.map((audition) => {
        if (audition.id === id) {
          // Cycle through statuses in order
          const statuses: Array<keyof typeof statusConfig> = [
            "submitted",
            "completed",
            "declined",
            "callback",
            "hold",
            "booked",
          ];
          const currentIndex = statuses.indexOf(
            audition.status as keyof typeof statusConfig
          );
          const nextIndex = (currentIndex + 1) % statuses.length;
          return { ...audition, status: statuses[nextIndex] };
        }
        return audition;
      })
    );
  };

  return (
    <div className="w-full max-w-xl aspect-[2.5/1] bg-primary-light-alt rounded-xl overflow-hidden relative">
      {/* Container with padding */}
      <div className="h-full flex flex-col justify-center relative px-8 py-6 gap-4">
        {/* Header */}
        <h3 className="text-2xl font-semibold text-primary-dark ml-1">
          Track Your Auditions
        </h3>

        {/* Mini Table */}
        <div className="w-full">
          {/* Table Header */}
          <div className="bg-[#E1DDCF]/50 rounded-t-md px-4 py-2 flex text-xs font-semibold text-primary-dark uppercase tracking-wider">
            <div className="flex-1">Date</div>
            <div className="flex-1">Project</div>
            <div className="flex-1">Status</div>
          </div>

          {/* Table Rows */}
          <div className="bg-white/70 backdrop-blur-sm rounded-b-md">
            {auditions.map((audition, index) => (
              <div
                key={audition.id}
                className={`flex items-center px-4 py-3 text-sm hover:bg-black/5 transition-colors ${
                  index !== auditions.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
              >
                <div className="flex-1 flex items-center gap-1.5 text-gray-600 text-xs">
                  <Calendar className="w-3 h-3" />
                  {new Date(audition.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex-1 font-medium text-primary-dark text-xs truncate">
                  {audition.project}
                </div>
                <div className="flex-1">
                  <button
                    onClick={() => handleStatusClick(audition.id)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer hover:opacity-80 active:scale-95 transition-all ${
                      statusConfig[audition.status as keyof typeof statusConfig]
                        .bgColor
                    } ${
                      statusConfig[audition.status as keyof typeof statusConfig]
                        .textColor
                    } ${
                      statusConfig[audition.status as keyof typeof statusConfig]
                        .borderColor
                    }`}
                  >
                    {
                      statusConfig[audition.status as keyof typeof statusConfig]
                        .label
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
