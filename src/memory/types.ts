import { Intent } from '../agent/intentParser';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}
export interface ExtractedEntities {
    doctor?: string;
    date?: string;
    time?: string;
    specialty?: string;   // e.g. "cardiologist", "dentist"
}

export interface SessionData {
    id: string;
    patientId?: string;
    history: Message[];
    currentIntent?: Intent;
    extractedEntities: ExtractedEntities;
    createdAt: Date;
}

