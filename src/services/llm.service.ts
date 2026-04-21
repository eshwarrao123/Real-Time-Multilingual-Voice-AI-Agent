import axios from 'axios';
import { Message } from '../memory/types';
import { Intent } from '../agent/intentParser';

export interface LLMEntities {
    doctor?: string;
    date?: string;
    time?: string;
    specialty?: string;
    bookingId?: string;
}

export interface LLMResult {
    intent: Intent;
    entities: LLMEntities;
    reasoning: string;
    reply: string;
}

const SYSTEM_PROMPT = `
You are a voice-based appointment booking assistant.
Your job is to understand what the user wants and respond with a structured JSON object.

You MUST respond ONLY with valid JSON. No extra text, no markdown, no code blocks.

Respond with this exact shape:
{
  "intent": "book" | "cancel" | "reschedule" | "check_availability" | "unknown",
  "entities": {
    "doctor": "doctor name if mentioned, else null",
    "date": "date if mentioned (keep natural form like 'monday', 'tomorrow'), else null",
    "time": "time if mentioned (e.g. '10 AM', '2:30 PM'), else null",
    "specialty": "medical specialty if mentioned (e.g. cardiologist), else null",
    "bookingId": "UUID booking ID if the user wants to cancel, else null"
  },
  "reasoning": "one sentence explaining why you chose this intent",
  "reply": "your friendly natural-language response to the user"
}

Rules:
- Use "unknown" if you cannot determine the intent.
- For multi-turn: if the user gives a date/time without repeating the intent, infer intent from context.
- Keep the "reply" warm, concise, and conversational.
- Never ask for information already provided.
`.trim();


export async function callLLM(history: Message[], userText: string): Promise<LLMResult> {
    const apiKey = process.env.LLM_API_KEY;

    if (!apiKey) {
        console.warn('⚠️  LLM_API_KEY not set — using mock fallback');
        return mockLLM(userText, history);
    }

    const baseURL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.LLM_MODEL || 'llama3-8b-8192';

    try {
        const response = await axios.post(
            `${baseURL}/chat/completions`,
            {
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...history,
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' },
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const raw = response.data.choices[0].message.content as string;
        return JSON.parse(raw) as LLMResult;

    } catch (err) {
        console.error('LLM call failed:', err);
        return mockLLM(userText, history);
    }
}

function mockLLM(userText: string, _history: Message[]): LLMResult {
    const lower = userText.toLowerCase();

    let intent: Intent = 'unknown';
    if (/reschedule|postpone|move my appointment/.test(lower)) intent = 'reschedule';
    else if (/cancel|delete|remove/.test(lower)) intent = 'cancel';
    else if (/book|schedule|appointment|arrange/.test(lower)) intent = 'book';
    else if (/available|slots|free|open|when can/.test(lower)) intent = 'check_availability';

    const doctorMatch = userText.match(/(?:dr\.?\s|doctor\s)([a-z]+)/i);
    const timeMatch = userText.match(/\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)|morning|afternoon|evening)\b/i);
    const dateMatch = userText.match(/\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+\w+)\b/i);
    const specialtyMatch = userText.match(/\b(cardiologist|dentist|dermatologist|neurologist|pediatrician|gynaecologist|orthopedic|general physician)\b/i);
    const idMatch = userText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

    const entities: LLMEntities = {
        doctor: doctorMatch ? `Dr. ${doctorMatch[1]}` : undefined,
        date: dateMatch ? dateMatch[1] : undefined,
        time: timeMatch ? timeMatch[1] : undefined,
        specialty: specialtyMatch ? specialtyMatch[1] : undefined,
        bookingId: idMatch ? idMatch[0] : undefined,
    };

    const reasoning = `[MOCK] Detected intent="${intent}" from keywords in: "${userText}"`;
    const reply = intent === 'unknown'
        ? 'I can help you book, cancel, reschedule, or check appointment availability. What would you like to do?'
        : `Understood — you want to ${intent.replace('_', ' ')}. Let me help you with that.`;

    return { intent, entities, reasoning, reply };
}
