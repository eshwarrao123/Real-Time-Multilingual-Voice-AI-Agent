import axios from 'axios';

interface STTResult {
    text: string;
    language?: string;
    durationMs?: number;
}

export async function speechToText(base64Audio: string): Promise<STTResult> {
    const apiKey = process.env.STT_API_KEY;

    if (!apiKey) {
        console.warn('STT_API_KEY not set — using mock transcription');
        return mockSTT(base64Audio);
    }

    return callWhisper(base64Audio, apiKey);
}

function mockSTT(base64Audio: string): STTResult {
    try {
        const decoded = Buffer.from(base64Audio, 'base64').toString('utf-8').trim();
        if (/^[\x20-\x7E\s]+$/.test(decoded) && decoded.length > 0) {
            console.log(`[MOCK STT] Using decoded text as transcript: "${decoded}"`);
            return { text: decoded, language: 'en', durationMs: 1000 };
        }
    } catch {
    }

    const fallback = 'I want to book an appointment';
    console.log(`[MOCK STT] Returning fallback transcript: "${fallback}"`);
    return { text: fallback, language: 'en', durationMs: 1000 };
}

async function callWhisper(base64Audio: string, apiKey: string): Promise<STTResult> {
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    const baseURL = process.env.STT_BASE_URL || 'https://api.openai.com/v1';

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-1');

    const response = await axios.post(
        `${baseURL}/audio/transcriptions`,
        form,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...form.getHeaders(),
            },
        },
    );

    return {
        text: response.data.text as string,
        language: response.data.language,
    };
}

