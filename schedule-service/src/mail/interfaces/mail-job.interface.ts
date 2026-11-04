export interface ScheduleEmailJobPayload {
  scheduleId: string;
  customerName: string;
  customerEmail: string;
  doctorName: string;
  scheduledAt: string | Date;
  objective: string;
}
