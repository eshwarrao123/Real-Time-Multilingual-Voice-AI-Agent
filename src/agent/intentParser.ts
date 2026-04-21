export type Intent = 'book' | 'cancel' | 'reschedule' | 'check_availability' | 'unknown';

export interface ParsedIntent {
    intent: Intent;
    doctor?: string;
    date?: string;
    time?: string;
}

const BOOK_KEYWORDS = ['book', 'schedule', 'set up', 'make an appointment', 'i need an appointment', 'arrange'];
const CANCEL_KEYWORDS = ['cancel', 'delete', 'remove', 'call off'];
const RESCHEDULE_KEYWORDS = ['reschedule', 'move', 'change my appointment', 'shift', 'postpone'];
const AVAILABILITY_KEYWORDS = ['available', 'availability', 'slots', 'free', 'open', 'when can i', 'what times'];

const DOCTOR_REGEX = /(?:dr\.?\s|doctor\s)([a-z]+)/i;

const TIME_REGEX = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)|morning|afternoon|evening|\d{1,2}:\d{2})\b/i;

const DATE_REGEX = /\b(\d{4}-\d{2}-\d{2}|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i;


export function parseIntent(text: string): ParsedIntent {
    const lower = text.toLowerCase();

    const intent = detectIntent(lower);
    const doctor = extractDoctor(text);
    const date = extractDate(lower);
    const time = extractTime(lower);

    return {
        intent,
        ...(doctor && { doctor }),
        ...(date && { date }),
        ...(time && { time }),
    };
}


function detectIntent(lower: string): Intent {
    if (RESCHEDULE_KEYWORDS.some(k => lower.includes(k))) return 'reschedule';
    if (CANCEL_KEYWORDS.some(k => lower.includes(k))) return 'cancel';
    if (BOOK_KEYWORDS.some(k => lower.includes(k))) return 'book';
    if (AVAILABILITY_KEYWORDS.some(k => lower.includes(k))) return 'check_availability';
    return 'unknown';
}

function extractDoctor(text: string): string | undefined {
    const match = text.match(DOCTOR_REGEX);
    return match ? `Dr. ${capitalize(match[1])}` : undefined;
}

function extractDate(lower: string): string | undefined {
    const match = lower.match(DATE_REGEX);
    return match ? match[1] : undefined;
}

function extractTime(lower: string): string | undefined {
    const match = lower.match(TIME_REGEX);
    return match ? match[1] : undefined;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
