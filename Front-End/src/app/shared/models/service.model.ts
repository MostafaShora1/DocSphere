export interface Service {
  id: string
  name: string
  description: string
  duration: string
  price: number
  doctorId: string
  isActive: boolean
  availableDays: string[];
  availableTimes: string[];
}