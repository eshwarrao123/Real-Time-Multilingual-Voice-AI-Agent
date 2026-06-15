import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createSession, deleteSession } from '../memory/sessionStore';
import { processVoiceMessage } from '../agent/voiceAgent';
import { speechToText } from '../services/stt.service';
import { textToSpeech } from '../services/tts.service';

interface TextClientMessage {
    type: 'user_message';
    message: string;
}

interface AudioClientMessage {
    type: 'audio';
    audio: string;
}

type ClientMessage = TextClientMessage | AudioClientMessage;

interface TextServerMessage {
    type: 'welcome' | 'reply' | 'error';
    reply?: string;
    sessionId?: string;
    message?: string;
}

interface Latency {
    stt: number;
    llm: number;
    tool: number;
    tts: number;
    total: number;
}

interface AudioReplyMessage {
    type: 'audio_reply';
    text: string;
    audio: string;
    mimeType: string;
    latency: Latency;
}

export function handleConnection(socket: WebSocket): void {
    const sessionId = uuidv4();
    createSession(sessionId);
    console.log(`Session started: ${sessionId}`);

    socket.send(JSON.stringify({
        type: 'welcome',
        sessionId,
        message: 'Connected! Send { type: "user_message" } or { type: "audio" }.',
    } as TextServerMessage));

    socket.on('message', async (rawData) => {
        try {
            const incoming = JSON.parse(rawData.toString()) as ClientMessage;

            if (incoming.type === 'user_message') {
                await handleTextMessage(socket, sessionId, incoming);
            } else if (incoming.type === 'audio') {
                await handleAudioMessage(socket, sessionId, incoming);
            } else {
                sendError(socket, sessionId, 'Unknown message type. Send "user_message" or "audio".');
            }
        } catch (err) {
            console.error(`[${sessionId}] Error:`, err);
            sendError(socket, sessionId, 'Internal error. Please try again.');
        }
    });

    socket.on('close', () => {
        deleteSession(sessionId);
        console.log(`🔌 Session closed: ${sessionId}`);
    });
}

async function handleTextMessage(
    socket: WebSocket,
    sessionId: string,
    msg: TextClientMessage,
): Promise<void> {
    if (!msg.message?.trim()) {
        sendError(socket, sessionId, 'Expected non-empty "message" field.');
        return;
    }

    console.log(`[${sessionId}] Text: ${msg.message}`);
    const { reply: replyText } = await processVoiceMessage(sessionId, msg.message);
    console.log(`[${sessionId}] Reply: ${replyText}`);

    socket.send(JSON.stringify({ type: 'reply', reply: replyText } as TextServerMessage));
}

// STT → agent → TTS with per-stage latency
async function handleAudioMessage(
    socket: WebSocket,
    sessionId: string,
    msg: AudioClientMessage,
): Promise<void> {
    if (!msg.audio?.trim()) {
        sendError(socket, sessionId, 'Expected non-empty "audio" field (base64 encoded).');
        return;
    }

    const totalStart = Date.now();

    // STT
    console.log(`🎙️  [${sessionId}] Received audio, running STT...`);
    const sttStart = Date.now();
    const sttResult = await speechToText(msg.audio);
    const sttMs = Date.now() - sttStart;
    console.log(`[${sessionId}] Transcribed: "${sttResult.text}"`);

    // Agent
    const { reply: replyText, latency: agentLatency } = await processVoiceMessage(sessionId, sttResult.text);
    console.log(`[${sessionId}] Reply: ${replyText}`);

    // TTS
    const ttsStart = Date.now();
    const ttsResult = await textToSpeech(replyText);
    const ttsMs = Date.now() - ttsStart;
    console.log(`[${sessionId}] TTS complete (${ttsResult.mimeType})`);

    const latency: Latency = {
        stt: sttMs,
        llm: agentLatency.llm,
        tool: agentLatency.tool,
        tts: ttsMs,
        total: Date.now() - totalStart,
    };

    console.log(
        `  [${sessionId}] [Latency] ` +
        `STT: ${latency.stt} ms | LLM: ${latency.llm} ms | ` +
        `Tool: ${latency.tool} ms | TTS: ${latency.tts} ms | Total: ${latency.total} ms`,
    );

    socket.send(JSON.stringify({
        type: 'audio_reply',
        text: replyText,
        audio: ttsResult.audioBase64,
        mimeType: ttsResult.mimeType,
        latency,
    } as AudioReplyMessage));
}

function sendError(socket: WebSocket, sessionId: string, message: string): void {
    console.error(`[${sessionId}] ${message}`);
    socket.send(JSON.stringify({ type: 'error', message } as TextServerMessage));
}
