import { useState, useMemo, useEffect } from 'react';
import { updateScript } from '@/lib/firebase/client/scripts';
import { set } from 'idb-keyval';
import type { ScriptElement } from '@/types/script';
import { Edit2, Check, X, AlertCircle } from 'lucide-react';

export function RoleSelector({
    script,
    onRolesUpdated,
    userID,
    scriptID,
    disabled,
}: {
    script: ScriptElement[];
    onRolesUpdated: (updatedScript: ScriptElement[]) => void;
    userID: string;
    scriptID: string;
    disabled?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [pendingRoles, setPendingRoles] = useState<Record<string, 'user' | 'scene-partner'>>({});
    const [isSaving, setIsSaving] = useState(false);

    const characterRoles = useMemo(() => getCharacterRoles(script), [script]);

    // Initialize pending roles when editing starts
    useEffect(() => {
        if (isEditing) {
            setPendingRoles(characterRoles);
        }
    }, [isEditing, characterRoles]);

    const currentUserRoles = useMemo(() => {
        return Object.entries(characterRoles)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, role]) => role === 'user')
            .map(([char]) => char);
    }, [characterRoles]);

    const pendingUserRoles = useMemo(() => {
        return Object.entries(pendingRoles)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, role]) => role === 'user')
            .map(([char]) => char);
    }, [pendingRoles]);

    const hasChanges = useMemo(() => {
        return JSON.stringify(characterRoles) !== JSON.stringify(pendingRoles);
    }, [characterRoles, pendingRoles]);

    const handleToggleRole = (charName: string) => {
        setPendingRoles(prev => ({
            ...prev,
            [charName]: prev[charName] === 'user' ? 'scene-partner' : 'user'
        }));
    };

    const handleCancel = () => {
        setIsEditing(false);
        setPendingRoles({});
    };

    const handleConfirm = async () => {
        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);

        try {
            // Update the script with new roles
            const updatedScript = script.map((el) => {
                if (el.type === 'line' && typeof el.character === 'string') {
                    const newRole = pendingRoles[el.character];
                    if (newRole && newRole !== el.role) {
                        return { ...el, role: newRole };
                    }
                }
                return el;
            });

            console.log('pending roles: ', pendingRoles);
            console.log('updated roles: ', updatedScript);

            // Save to Firestore
            await updateScript(scriptID, updatedScript);
            console.log('📤 Saved updated roles to Firestore');

            // Cache locally
            await set(`script-cache:${userID}:${scriptID}`, updatedScript);
            console.log('💾 Script cached successfully');

            // Update parent component
            onRolesUpdated(updatedScript);

            setIsEditing(false);
            setPendingRoles({});
        } catch (err) {
            console.error('❌ Failed to save script:', err);
            alert('Failed to save role changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="space-y-3">
                {/* Current Role Display */}
                <div className="text-sm text-gray-200 flex flex-col items-start flex-wrap gap-2">
                    <span className="font-semibold">Role Selection:</span>
                    {currentUserRoles.length > 0 ? (
                        <>
                            <span className="text-gray-400">
                                {"You are reading for: "}
                                <span className="font-semibold text-blue-500">
                                    {currentUserRoles.join(', ')}
                                </span>
                            </span>
                        </>
                    ) : (
                        <span className="text-gray-400">You are not reading any roles</span>
                    )}
                </div>

                {/* Edit Button */}
                <button
                    onClick={() => setIsEditing(true)}
                    disabled={disabled}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Edit2 className="w-4 h-4" />
                    Change Roles
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Edit Mode Header */}
            <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                    <p className="font-medium text-yellow-400 mb-1">Select Your Roles</p>
                    <p className="text-xs text-gray-400">
                        {"Blue = you, Purple = scene partner."}
                    </p>
                </div>
            </div>

            {/* Character Selection Grid */}
            <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(pendingRoles).map(([char, role]) => (
                        <button
                            key={char}
                            onClick={() => handleToggleRole(char)}
                            disabled={isSaving}
                            className={`
                                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${role === 'user'
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                    : 'bg-purple-600/70 text-purple-100 hover:bg-purple-600'
                                }
                            `}
                        >
                            {char}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview of Changes */}
            {hasChanges && (
                <div className="text-xs text-gray-400 bg-gray-900/30 rounded p-2">
                    {pendingUserRoles.length > 0 ? (
                        <>You will read for: <span className="text-blue-400">{pendingUserRoles.join(', ')}</span></>
                    ) : (
                        <>You will not read for any characters!</>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleConfirm}
                    disabled={isSaving || !hasChanges}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            Confirm
                        </>
                    )}
                </button>

                <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-red-400 text-gray-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
            </div>
        </div>
    );
}

function getCharacterRoles(script: ScriptElement[]): Record<string, 'user' | 'scene-partner'> {
    const roleMap: Record<string, 'user' | 'scene-partner'> = {};

    for (const item of script) {
        if (item.type === 'line' && typeof item.character === 'string') {
            if (!(item.character in roleMap)) {
                roleMap[item.character] = item.role ?? 'scene-partner';
            }
        }
    }

    return roleMap;
}