import type { ScriptElement } from '@/types/script';

type ParsedOutputProps = {
    data: ScriptElement[];
};

export default function ParsedOutput({ data }: ParsedOutputProps) {
    return (
        <div className="mt-6" style={{ flex: 1 }}>
            {/* <h2 className="text-black text-lg font-semibold mb-4">Parsed Script:</h2> */}
            <div className="bg-white border border-gray-300 rounded-lg p-8 max-w-4xl mx-auto font-mono text-sm leading-relaxed">
                {data && data.map((item: ScriptElement, index: number) => {
                    switch (item.type) {
                        case 'scene':
                            return (
                                <div key={index} className="mb-6">
                                    <div className="text-center font-bold text-gray-800 uppercase tracking-wide text-left">
                                        {item.text}
                                    </div>
                                </div>
                            );

                        case 'line':
                            return (
                                <div key={index} className="mb-4 mx-8 lg:mx-16 px-16">
                                    <div className="flex flex-col">
                                        {/* Centered character name */}
                                        <span className="font-bold text-gray-900 uppercase tracking-wide text-black text-center mb-1">
                                            {item.character}
                                        </span>

                                        {/* Role badge aligned right */}
                                        <div className="flex justify-end mb-1">
                                            <span
                                                className={`text-xs px-2 py-1 rounded border ${
                                                item.role === 'user'
                                                    ? 'bg-green-100 border-green-300 text-green-800'
                                                    : 'bg-blue-100 border-blue-300 text-blue-800'
                                                }`}
                                            >
                                                {item.role === 'user' ? 'You' : 'Play partner'}
                                            </span>
                                        </div>

                                        {/* Dialogue text */}
                                        <div className="text-gray-800 leading-relaxed pl-4 text-black">
                                            {item.text}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'direction':
                            return (
                                <div key={index} className="mb-4 mx-12 lg:mx-20">
                                    <div className="text-gray-600 italic text-left">
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