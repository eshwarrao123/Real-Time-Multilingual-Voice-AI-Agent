import { getAllAppointments } from './appointmentManager';

export function isSlotAvailable(date: string, time: string): boolean {
    const existing = getAllAppointments();
    return !existing.some((a) => a.date === date && a.time === time);
}
