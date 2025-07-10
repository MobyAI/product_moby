'use client';

import { storeScript } from '@/lib/storeScript';

export default function RehearsalRoom() {
    const script = storeScript((s) => s.script);

    console.log('script in rehearsal room: ', script);

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold">Rehearsal Room</h1>
            <p>Open the console to inspect the script.</p>
        </div>
    );
}