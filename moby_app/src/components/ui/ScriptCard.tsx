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
}

export function ScriptCard({
    name,
    createdAt,
    lastPracticed,
    handleDelete,
    handlePractice
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
        <div className="bg-primary-light rounded-xl p-5 mx-4 shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
                <div>
                    {/* Script Name */}
                    <h3 className="text-header-3 font-semibold text-white truncate flex-1 mr-4">
                        {name}
                    </h3>

                    {/* Created Date */}
                    {formatted && (
                        <p className="text-sm text-white mt-1">
                            Created <span className="font-semibold text-accent">{formatted}</span>
                        </p>
                    )}

                    {/* Last Practiced */}
                    {formattedLastPracticed && (
                        <p className="text-sm text-white mt-0.5">
                            Last practiced <span className="font-semibold text-accent">{formattedLastPracticed}</span>
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleDelete}
                        icon={Trash2}
                        iconOnly
                        variant="ghost"
                        size="lg"
                        aria-label={`Delete ${name}`}
                        title="Delete script"
                    />

                    <Button
                        onClick={handlePractice}
                        icon={Play}
                        variant="primary"
                        size="md"
                        aria-label={`Practice ${name}`}
                        title="Practice script"
                    >
                        Practice
                    </Button>
                </div>
            </div>
        </div>
    );
}