import type { ScriptElement } from '@/types/script';

type ParsedOutputProps = {
    data: ScriptElement[];
};

export default function ParsedOutput({ data }: ParsedOutputProps) {
    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Parsed Script:</h2>
            <div className="bg-white border border-gray-300 rounded-lg p-8 max-w-4xl mx-auto font-mono text-sm leading-relaxed">
                {data.map((item: ScriptElement, index: number) => {
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
                                <div key={index} className="mb-4 mx-8 lg:mx-16">
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 uppercase tracking-wide">
                                                {item.character}
                                            </span>
                                            <span className="text-xs text-gray-500 italic px-2 py-1 bg-gray-100 rounded">
                                                {item.tone}
                                            </span>
                                            <span
                                                className={`text-xs px-2 py-1 rounded border ${item.role === 'user'
                                                        ? 'bg-green-100 border-green-300 text-green-800'
                                                        : 'bg-blue-100 border-blue-300 text-blue-800'
                                                    }`}
                                            >
                                                {item.role === 'user' ? '🙋 You' : '🤖 Scene Partner'}
                                            </span>
                                        </div>
                                        <div className="text-gray-800 leading-relaxed pl-4">
                                            {item.text}
                                        </div>
                                    </div>
                                </div>
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