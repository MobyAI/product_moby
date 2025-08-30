import React from "react";
import { Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui";

interface ScriptCardProps {
    name: string;
    handleDelete: () => void;
    handlePractice: () => void;
}

export function ScriptCard({
    name,
    handleDelete,
    handlePractice
}: ScriptCardProps) {
    return (
        <div className="bg-primary rounded-xl p-5 mx-4 shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
                {/* Script Name */}
                <h3 className="text-lg font-semibold text-white truncate flex-1 mr-4">
                    {name}
                </h3>

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