import React from "react";
import { Trash, Play, Minus } from "lucide-react";
import { Button } from "@/components/ui";
import { Timestamp } from "firebase/firestore";

interface ScriptCardProps {
  name: string;
  createdAt: Timestamp | null;
  lastPracticed: Timestamp | null;
  starred: boolean;
  starringItemId: string | null;
  handleDelete: () => void;
  handlePractice: () => void;
  handleToggleStarred: () => void;
  bgColor: string;
}

export function ScriptCard({
  name,
  createdAt,
  lastPracticed,
  starred,
  starringItemId,
  handleDelete,
  handlePractice,
  handleToggleStarred,
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
      {/* Top section: name and dates */}
      <div className="flex-1 min-w-0 overflow-hidden">
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

      {/* Bottom section: All buttons */}
      <div className="mt-auto flex gap-2">
        {/* Toggle Starred button - 25% width */}
        <div className="flex-1">
          <Button
            onClick={handleToggleStarred}
            disabled={starringItemId != null}
            icon={Minus}
            iconOnly
            variant="ghost"
            size="md"
            aria-label={starred ? "Unstar" : "Star"}
            title={starred ? "Unstar script" : "Star script"}
            className="w-full h-12"
          />
        </div>

        {/* Delete button - 25% width */}
        <div className="flex-1">
          <Button
            onClick={handleDelete}
            icon={Trash}
            iconOnly
            variant="ghost"
            size="md"
            aria-label={`Delete ${name}`}
            title="Delete script"
            className="w-full h-12"
          />
        </div>

        {/* Practice button - 50% width */}
        <div className="flex-[2]">
          <Button
            onClick={handlePractice}
            icon={Play}
            variant="ghost"
            size="md"
            aria-label={`Practice ${name}`}
            title="Practice script"
            className="w-full h-12"
          >
            Practice
          </Button>
        </div>
      </div>
    </div>
  );
}
