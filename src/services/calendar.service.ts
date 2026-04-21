import {
    bookAppointment,
    cancelAppointment,
    getAllAppointments,
    type Appointment,
} from '../scheduler/appointmentManager';

const ALL_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

export async function getAvailableSlots(date: string): Promise<string[]> {
    const booked = getAllAppointments()
        .filter(a => a.date === date)
        .map(a => a.time);

    return ALL_SLOTS.filter(slot => !booked.includes(slot));
}

export async function bookSlot(
    sessionId: string,
    date: string,
    time: string,
    doctor?: string,
): Promise<Appointment | null> {
    const available = await getAvailableSlots(date);
    if (!available.includes(time)) return null;

    return bookAppointment(sessionId, date, time, doctor);
}

export async function cancelSlot(appointmentId: string): Promise<boolean> {
    return cancelAppointment(appointmentId);
}
