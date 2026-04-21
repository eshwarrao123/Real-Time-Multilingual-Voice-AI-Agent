import { v4 as uuidv4 } from 'uuid';

export interface Appointment {
    id: string;
    date: string;
    time: string;
    sessionId: string;
    doctor?: string;
    createdAt: Date;
}

const appointments = new Map<string, Appointment>();

export function bookAppointment(sessionId: string, date: string, time: string, doctor?: string): Appointment {
    const appointment: Appointment = {
        id: uuidv4(),
        date,
        time,
        sessionId,
        ...(doctor && { doctor }),
        createdAt: new Date(),
    };
    appointments.set(appointment.id, appointment);
    console.log(`📅 Appointment booked: ${date} at ${time}${doctor ? ` with ${doctor}` : ''} [ID: ${appointment.id}]`);
    return appointment;
}

export function cancelAppointment(appointmentId: string): boolean {
    return appointments.delete(appointmentId);
}

export function getAppointment(appointmentId: string): Appointment | undefined {
    return appointments.get(appointmentId);
}

export function getAllAppointments(): Appointment[] {
    return Array.from(appointments.values());
}
