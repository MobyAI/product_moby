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

export interface AuditionsData {
    date: string; 
    projectTitle: string; 
    castingDirector: string; 
    auditionType: string; 
    auditionRole: string; 
    billing: string; 
    source: string; 
    status: string; 
    ownerUid: string; 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: any; 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedAt: any; 
    id: string;
}

export type ProjectTypeFilter = AuditionData['projectType'] | 'all';
export type StatusFilter = AuditionData['status'] | 'all';