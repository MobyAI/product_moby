export interface AuditionData {
    id: number | string;
    date: string;
    projectName: string;
    projectType: 'tv' | 'film' | 'commercial' | 'theater' | 'voiceover' | 'other';
    castingDirector: string;
    role: string;
    source: string;
    billing: 'star' | 'co-star' | 'guest-star' | 'recurring' | 'extra' | 'featured' | 'lead' | 'supporting';
    status: 'completed' | 'booked' | 'callback' | 'declined' | 'hold';
}

export type ProjectTypeFilter = AuditionData['projectType'] | 'all';
export type StatusFilter = AuditionData['status'] | 'all';