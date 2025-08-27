"use client";

import AuditionHistory from '@/components/auditions/AuditionHistory';
import AddAuditionButton from '../auditions/add/page';

export default function TrackerPage() {
    return (
        <>
            <AddAuditionButton />
            <AuditionHistory />
        </>
    )
}