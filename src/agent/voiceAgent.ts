import { addMessage, getSession, updateContext } from '../memory/sessionStore';
import { getAvailableSlots, bookSlot, cancelSlot } from '../services/calendar.service';
import { updateProfile } from '../memory/persistentMemory';
import { callLLM } from '../services/llm.service';

export interface AgentLatency {
    llm: number;
    tool: number;
}

export interface AgentResult {
    reply: string;
    latency: AgentLatency;
}

// Devanagari = Hindi, Tamil block = Tamil
function detectLanguage(text: string): string {
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    return 'en';
}

// Placeholder — swap with real translation API later
function mockTranslate(text: string, lang: string): string {
    if (lang === 'hi') return `[Hindi Translation] ${text}`;
    if (lang === 'ta') return `[Tamil Translation] ${text}`;
    return text;
}

export async function processVoiceMessage(sessionId: string, userText: string): Promise<AgentResult> {
    const session = getSession(sessionId);
    if (!session) {
        return { reply: 'Session not found. Please reconnect.', latency: { llm: 0, tool: 0 } };
    }

    addMessage(sessionId, { role: 'user', content: userText });

    const detectedLang = detectLanguage(userText);
    if (session.patientId) {
        updateProfile(session.patientId, { preferredLanguage: detectedLang });
    }

    // LLM call
    const llmStart = Date.now();
    const llmResult = await callLLM(session.history, userText);
    const llmMs = Date.now() - llmStart;

    const { intent, entities, reasoning } = llmResult;

    console.log(`\n🤖 [${sessionId}] Reasoning: ${reasoning}`);
    console.log(`   Intent: ${intent} | Entities:`, entities);
    console.log(`   Language: ${detectedLang}`);

    const effectiveIntent = intent !== 'unknown' ? intent : (session.currentIntent ?? 'unknown');
    updateContext(sessionId, effectiveIntent, {
        doctor: entities.doctor ?? undefined,
        date: entities.date ?? undefined,
        time: entities.time ?? undefined,
        specialty: entities.specialty ?? undefined,
    });

    const ctx = getSession(sessionId)!.extractedEntities;

    // Tool dispatch
    let reply: string;
    const toolStart = Date.now();

    switch (effectiveIntent) {

        case 'check_availability': {
            if (!ctx.date) {
                reply = 'Which date would you like to check? (e.g. "tomorrow", "Monday", "25th April")';
                break;
            }
            const slots = await getAvailableSlots(ctx.date);
            reply = slots.length === 0
                ? `No slots available on ${ctx.date}. Try a different date?`
                : `Available slots on ${ctx.date}: ${slots.join(', ')}. Which time works for you?`;
            break;
        }

        case 'book': {
            if (!ctx.date && !ctx.time) {
                const hint = ctx.specialty ? ` for a ${ctx.specialty}` : '';
                reply = `Sure! When would you like the appointment${hint}? Please share a date and time.`;
                break;
            }
            if (!ctx.date) {
                reply = `Got the time (${ctx.time}). Which date works for you?`;
                break;
            }
            if (!ctx.time) {
                const slots = await getAvailableSlots(ctx.date);
                reply = slots.length > 0
                    ? `For ${ctx.date}, available slots: ${slots.join(', ')}. Which time works?`
                    : `No slots on ${ctx.date}. Try another date?`;
                break;
            }
            const doctorName = ctx.doctor ?? (ctx.specialty ? `a ${ctx.specialty}` : undefined);
            const appointment = await bookSlot(sessionId, ctx.date, ctx.time, doctorName);
            if (!appointment) {
                reply = `Sorry, ${ctx.time} on ${ctx.date} is already taken. Any other time?`;
            } else {
                const doctorLine = appointment.doctor ? ` with ${appointment.doctor}` : '';
                reply = `✅ Booked${doctorLine} on ${ctx.date} at ${ctx.time}. Booking ID: ${appointment.id}`;
                if (session.patientId) {
                    updateProfile(session.patientId, {
                        lastDoctor: appointment.doctor,
                        lastBookingDate: ctx.date,
                    });
                }
            }
            break;
        }

        case 'cancel': {
            const bookingId = entities.bookingId
                ?? userText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
            if (!bookingId) {
                reply = 'Please provide your booking ID to cancel (e.g. "cancel abc123...").';
                break;
            }
            const success = await cancelSlot(bookingId);
            reply = success
                ? `✅ Appointment ${bookingId} has been cancelled.`
                : `❌ No appointment found with ID ${bookingId}. Please check the ID.`;
            break;
        }

        case 'reschedule': {
            reply = 'To reschedule: first cancel your current appointment (share the booking ID), then book a new slot.';
            break;
        }

        default: {
            reply = llmResult.reply || 'I can help you book, cancel, reschedule, or check appointment availability.';
        }
    }

    const toolMs = Date.now() - toolStart;

    reply = mockTranslate(reply, detectedLang);
    addMessage(sessionId, { role: 'assistant', content: reply });

    return { reply, latency: { llm: llmMs, tool: toolMs } };
}
