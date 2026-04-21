import 'dotenv/config';


export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    stt: {
        apiKey: process.env.STT_API_KEY || '',
    },
    tts: {
        apiKey: process.env.TTS_API_KEY || '',
    },
    llm: {
        apiKey: process.env.LLM_API_KEY || '',
        baseUrl: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
        model: process.env.LLM_MODEL || 'llama3-8b-8192',
    },
};
