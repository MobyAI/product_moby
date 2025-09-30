export interface AlignmentWord {
    text: string;
    start: number;
    end: number;
}

export interface AlignmentData {
    words: AlignmentWord[];
}