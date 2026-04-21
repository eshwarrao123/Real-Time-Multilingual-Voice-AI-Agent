import axios from 'axios';

interface TTSResult {
    audioBase64: string;
    mimeType: string;
}
export async function textToSpeech(text: string): Promise<TTSResult> {
    const apiKey = process.env.TTS_API_KEY;

    if (!apiKey) {
        console.warn('⚠️  TTS_API_KEY not set — using mock audio');
        return mockTTS(text);
    }

    return callElevenLabs(text, apiKey);
}

function mockTTS(text: string): TTSResult {
    const audioBase64 = Buffer.from(text, 'utf-8').toString('base64');
    console.log(`🔊 [MOCK TTS] Encoded reply as base64 (${text.length} chars)`);
    return {
        audioBase64,
        mimeType: 'text/plain',
    };
}

async function callElevenLabs(text: string, apiKey: string): Promise<TTSResult> {
    const voiceId = process.env.TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const baseURL = process.env.TTS_BASE_URL || 'https://api.elevenlabs.io/v1';

    const response = await axios.post(
        `${baseURL}/text-to-speech/${voiceId}`,
        {
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        },
        {
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            responseType: 'arraybuffer',
        },
    );

    const audioBase64 = Buffer.from(response.data as ArrayBuffer).toString('base64');
    return { audioBase64, mimeType: 'audio/mpeg' };
}

