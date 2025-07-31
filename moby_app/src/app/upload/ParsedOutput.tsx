import type { ScriptElement } from '@/types/script';
import EditableLine from './EditableLine';

type ParsedOutputProps = {
    data: ScriptElement[];
    onUpdateLine: (index: number, updated: ScriptElement) => void;
};

export default function ParsedOutput({ data, onUpdateLine }: ParsedOutputProps) {
    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Parsed Script:</h2>
            <div className="bg-white border border-gray-300 rounded-lg p-8 max-w-4xl mx-auto font-mono text-sm leading-relaxed">
                
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.map((item: any, index: number) => {
                    switch (item.type) {
                        case 'scene':
                            return (
                                <div key={index} className="mb-6">
                                    <div className="text-center font-bold text-gray-800 uppercase tracking-wide">
                                        {item.text}
                                    </div>
                                </div>
                            );

                        case 'line':
                            return (
                                <EditableLine
                                    key={index}
                                    item={item}
                                    onUpdate={(updatedItem) => onUpdateLine(index, updatedItem)}
                                />
                            );

                        case 'direction':
                            return (
                                <div key={index} className="mb-4 mx-12 lg:mx-20">
                                    <div className="text-gray-600 italic text-center">
                                        ({item.text})
                                    </div>
                                </div>
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
}