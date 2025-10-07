import React, { useState, ReactNode } from 'react';
import {
    Clock,
    User,
    Moon,
    X,
    Check,
    DoorOpen,
    Expand
} from 'lucide-react';

type PanelType = 'auto' | 'roles' | 'dark' | 'fullscreen' | 'exit' | null;
type Role = 'Rachel' | 'Terry' | 'Joey' | 'Chandler';

interface ControlPanelProps {
    children: ReactNode;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ children }) => {
    const [activePanel, setActivePanel] = useState<PanelType>(null);
    const [selectedRole, setSelectedRole] = useState<Role>('Rachel');

    const handleNavClick = (panel: PanelType) => {
        setActivePanel(activePanel === panel ? null : panel);
    };

    const roles: Role[] = ['Rachel', 'Terry', 'Joey', 'Chandler'];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Navigation Bar */}
            <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-6">
                <div className="text-2xl font-bold text-gray-800">tr</div>

                <button
                    onClick={() => handleNavClick('auto')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors group relative"
                >
                    <Clock className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                        Auto Advance
                    </span>
                </button>

                <button
                    onClick={() => handleNavClick('roles')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors group relative"
                >
                    <User className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                        Role Change
                    </span>
                </button>

                <button
                    onClick={() => handleNavClick('dark')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors group relative"
                >
                    <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                        Dark Mode
                    </span>
                </button>

                <button
                    onClick={() => handleNavClick('fullscreen')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors group relative"
                >
                    <Expand className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                        Fullscreen Mode
                    </span>
                </button>

                <button
                    onClick={() => handleNavClick('exit')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors group relative"
                >
                    <DoorOpen className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                        Exit
                    </span>
                </button>
            </div>

            {/* Settings Panel (slides out when a button is clicked) */}
            {activePanel && (
                <div className="w-56 bg-white border-r border-gray-200 p-4 animate-in slide-in-from-left duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-700">
                            {activePanel === 'auto' && 'Auto Advance'}
                            {activePanel === 'roles' && 'Select your roles'}
                            {activePanel === 'dark' && 'Dark Mode'}
                            {activePanel === 'fullscreen' && 'Fullscreen Mode'}
                            {activePanel === 'exit' && 'Exit'}
                        </h3>
                        <button
                            onClick={() => setActivePanel(null)}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Role Selection Panel Content */}
                    {activePanel === 'roles' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-center mb-4">
                                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                                    Select your roles
                                </div>
                            </div>
                            {roles.map((role) => (
                                <button
                                    key={role}
                                    onClick={() => {
                                        setSelectedRole(role);
                                        // Handle role selection
                                        console.log(`Selected role: ${role}`);
                                    }}
                                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${selectedRole === role
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    // Handle confirmation
                                    console.log('Confirmed role selection');
                                    setActivePanel(null);
                                }}
                                className="w-full mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                            >
                                Confirm
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Other Panel Contents */}
                    {activePanel === 'auto' && (
                        <div className="text-sm text-gray-600">
                            <p>Auto advance settings will go here</p>
                            {/* Add auto advance controls */}
                        </div>
                    )}

                    {activePanel === 'dark' && (
                        <div className="text-sm text-gray-600">
                            <p>Dark mode toggle will go here</p>
                            {/* Add dark mode toggle */}
                        </div>
                    )}

                    {activePanel === 'fullscreen' && (
                        <div className="text-sm text-gray-600">
                            <p>Subscribe mode settings will go here</p>
                            {/* Add subscribe settings */}
                        </div>
                    )}

                    {activePanel === 'exit' && (
                        <div className="text-sm text-gray-600">
                            <p>Edit settings will go here</p>
                            {/* Add edit settings */}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area with Children */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
};