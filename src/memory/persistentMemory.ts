
export interface PatientProfile {
    patientId: string;
    preferredLanguage: string;   // e.g. 'en', 'hi', 'es'
    lastDoctor?: string;         // last doctor we booked with
    lastBookingDate?: string;    // last appointment date
    name?: string;               // optional patient name
}

const patientProfiles = new Map<string, PatientProfile>();

export function getOrCreateProfile(patientId: string): PatientProfile {
    if (!patientProfiles.has(patientId)) {
        patientProfiles.set(patientId, {
            patientId,
            preferredLanguage: 'en',
        });
    }
    return patientProfiles.get(patientId)!;
}

export function updateProfile(
    patientId: string,
    updates: Partial<Omit<PatientProfile, 'patientId'>>,
): PatientProfile {
    const profile = getOrCreateProfile(patientId);
    Object.assign(profile, updates);
    return profile;
}

export function getProfile(patientId: string): PatientProfile | undefined {
    return patientProfiles.get(patientId);
}
