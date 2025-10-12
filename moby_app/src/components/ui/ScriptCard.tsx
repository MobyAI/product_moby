import React from "react";
import { Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui";
import { Timestamp } from "firebase/firestore";

interface ScriptCardProps {
  name: string;
  createdAt: Timestamp | null;
  lastPracticed: Timestamp | null;
  handleDelete: () => void;
  handlePractice: () => void;
  bgColor: string;
}

export function ScriptCard({
  name,
  createdAt,
  lastPracticed,
  handleDelete,
  handlePractice,
  bgColor,
}: ScriptCardProps) {
  const date = createdAt?.toDate ? createdAt.toDate() : null;
  const formatted = date
    ? date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const practicedDate = lastPracticed?.toDate ? lastPracticed.toDate() : null;
  const formattedLastPracticed = practicedDate
    ? practicedDate
        .toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", " at") // 👈 replaces comma with " at"
    : "";

  return (
    <div
      className={`${bgColor} rounded-[10px] p-8 shadow-md transition-shadow duration-200
              w-90 h-60 flex flex-col justify-between`}
    >
      {/* Top section: name + delete */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mb-4 overflow-hidden">
          {/* Script Name */}
          <h3
            className="text-xl font-semibold text-white truncate"
            title={name} // shows full name on hover
          >
            {name}
          </h3>

          {/* Created Date */}
          {formatted && (
            <p className="text-sm text-white mt-3">
              Created{" "}
              <span className="font-semibold text-accent">{formatted}</span>
            </p>
          )}

          {/* Last Practiced */}
          {formattedLastPracticed && (
            <p className="text-sm text-white mt-1">
              Last practiced{" "}
              <span className="font-semibold text-accent">
                {formattedLastPracticed}
              </span>
            </p>
          )}
        </div>

        {/* Delete button - top right */}
        <Button
          onClick={handleDelete}
          icon={Trash2}
          iconOnly
          variant="ghost"
          size="sm"
          aria-label={`Delete ${name}`}
          title="Delete script"
          className="shrink-0 ml-2"
        />
      </div>

      {/* Bottom section: Practice button */}
      <div className="mt-auto">
        <Button
          onClick={handlePractice}
          icon={Play}
          variant="ghost"
          size="md"
          aria-label={`Practice ${name}`}
          title="Practice script"
        >
          Practice
        </Button>
      </div>
    </div>
  );
}
