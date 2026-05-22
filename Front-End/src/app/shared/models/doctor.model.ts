export interface Doctor {
  id: string;
  userId?: string;
  name: string;
  fullNameAr?: string;
  fullNameEn?: string;
  specialty: string;
  specialtyId?: string;
  experience: string;
  rating: number;
  phone?: string;
  email?: string;
  bio: string;
  image: string;
  isApproved?: boolean;
  isActive?: boolean;
  moderationStatus?: 'approved' | 'pending' | 'rejected' | 'deactivated';
  consultationFee?: number;
  availableDays: string[];
  availableTimes: string[];
  certificate?: string;
}
