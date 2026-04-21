import { SessionData, Message, ExtractedEntities } from './types';
import { Intent } from '../agent/intentParser';

// In-memory store: sessionId -> SessionData
const sessions = new Map<string, SessionData>();

export function createSession(sessionId: string): void {
    sessions.set(sessionId, {
        id: sessionId,
        history: [],
        extractedEntities: {},      // starts empty, filled as user speaks
        createdAt: new Date(),
    });
}

export function getSession(sessionId: string): SessionData | undefined {
    return sessions.get(sessionId);
}

export function addMessage(sessionId: string, message: Message): void {
    sessions.get(sessionId)?.history.push(message);
}

/**
 * Merges new intent + entities into the session — called after every agent turn.
 * Only overwrites a field if the latest parse actually found a value for it,
 * so earlier context is preserved when users give partial answers.
 *
 * Example:
 *   Turn 1: user says "book appointment" → intent=book, no date/time yet
 *   Turn 2: user says "cardiologist, Monday at 10 AM" → entities fill in
 */
export function updateContext(
    sessionId: string,
    intent: Intent,
    newEntities: ExtractedEntities,
): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    // Always update intent to the latest detected one
    session.currentIntent = intent;

    // Merge entities: only overwrite fields that are newly extracted
    session.extractedEntities = {
        ...session.extractedEntities,
        ...Object.fromEntries(
            Object.entries(newEntities).filter(([, v]) => v !== undefined),
        ),
    };
}

export function deleteSession(sessionId: string): void {
    sessions.delete(sessionId);
}

