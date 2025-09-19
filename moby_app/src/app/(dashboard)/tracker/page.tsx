import { Metadata } from 'next';
import AuditionHistory from '@/components/auditions/AuditionHistory';

export const metadata: Metadata = {
    title: "Audition Tracker - Playr",
    description: "Track and manage your audition history",
};

export default function TrackerPage() {
    return (
        <>
            <AuditionHistory />
        </>
    )
}