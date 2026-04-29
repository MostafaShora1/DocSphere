export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  serviceId: string
  date: Date
  status: 'pending' | 'confirmed' | 'cancelled'
}