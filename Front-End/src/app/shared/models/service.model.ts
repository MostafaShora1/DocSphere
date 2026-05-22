export interface Service {
  id: string
  name: string
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  duration: string
  price: number
  doctorId: string
  isActive: boolean
  availableDays: string[];
  availableTimes: string[];
}