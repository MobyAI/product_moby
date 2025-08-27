import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface HeadshotData {
    id: string;
    originalUrl: string;
    thumbnailUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
    uploadedAt: Timestamp | FieldValue;
}

export interface ResumeData {
    id: string;
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    uploadedAt: Timestamp | FieldValue;
}