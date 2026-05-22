import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Doctor } from '../../shared/models/doctor.model';
import { Service } from '../../shared/models/service.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly rejectedDoctorsKey = 'rejectedDoctorIds';
  private readonly deactivatedDoctorsKey = 'deactivatedDoctorIds';

  constructor(private http: HttpClient) { }

  getServices(): Observable<Service[]> {
    return this.http
      .get<{ data: { services: any[] } }>(`${this.baseUrl}/services`)
      .pipe(
        map(response =>
          (response.data.services || [])
            .map(service => ({
              id: service.id || service._id || '',
              name: service.name || '',
              nameKey: service.nameKey,
              description: service.description || '',
              descriptionKey: service.descriptionKey,
              duration: service.duration || '',
              price: service.price ?? 0,
              doctorId: service.doctorId || service.doctor?._id || service.doctor || '',
              isActive: service.isActive ?? true,
              availableDays: service.availableDays || [],
              availableTimes: service.availableTimes || []
            }))
            .filter(service => service.id && !this.isDoctorModeratedOut(service.doctorId))
        )
      );
  }

  getDoctors(includeUnapproved = false): Observable<Doctor[]> {
    let url = `${this.baseUrl}/doctors`;
    if (includeUnapproved) {
      url += '?isActive=all&isApproved=all';
    }
    return this.http
      .get<{ data: any[] }>(url)
      .pipe(
        map(response =>
          (response.data || [])
            .map(doctor => {
              const moderatedStatus = this.getDoctorModerationStatus(doctor._id);
              const isApproved = doctor.isApproved ?? false;
              const apiIsActive = doctor.isActive !== false;
              
              const moderationStatus: 'approved' | 'pending' | 'rejected' | 'deactivated' =
                moderatedStatus || 
                (apiIsActive ? (isApproved ? 'approved' : 'pending') : 'deactivated');
              
              const isActive = apiIsActive && moderatedStatus !== 'deactivated' && moderatedStatus !== 'rejected';

              return {
                id: doctor._id,
                userId: doctor.user?._id,
                name: doctor.fullName || doctor.user?.name || doctor.user?.email || 'Doctor',
                specialty: doctor.specialty?.name || 'General',
                specialtyId: doctor.specialty?._id,
                experience: `${doctor.experience ?? doctor.experienceYears ?? 0} years`,
                rating: doctor.averageRating ?? doctor.rating ?? 0,
                phone: doctor.user?.phonePrimary || doctor.user?.phone || '',
                email: doctor.user?.email || '',
                bio: doctor.bio || '',
                image: doctor.profilePicture || doctor.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.fullName || 'Doctor')}&background=0D8ABC&color=fff`,
                isApproved,
                isActive,
                moderationStatus,
                consultationFee: doctor.consultationFee ?? 0,
                availableDays: doctor.availableDays || [],
                availableTimes: doctor.availableTimes || [],
                certificate: doctor.certificate || ''
              };
            })
            .filter(doctor => {
              if (doctor.moderationStatus === 'rejected' || doctor.moderationStatus === 'deactivated') {
                return includeUnapproved;
              }

              return includeUnapproved || doctor.isApproved;
            })
        )
      );
  }

  getDoctorById(id: string | number): Observable<Doctor | undefined> {
    return this.getDoctors().pipe(
      map(doctors =>
        doctors.find(doctor => doctor.id === id || doctor.id === String(id))
      )
    );
  }

  getSpecialties(): Observable<Array<{ id: string; name: string }>> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/specialties`)
      .pipe(
        map(response =>
          (response.data || []).map(specialty => ({
            id: specialty._id,
            name: specialty.name || 'Specialty'
          }))
        )
      );
  }

  getAdminUsers(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/admin/users`)
      .pipe(map(response => response.data || []));
  }

  getAdmins(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/admins`)
      .pipe(map(response => response.data || []));
  }

  getReviews(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/reviews`)
      .pipe(map(response => response.data || []));
  }

  getMyReviews(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/reviews/me`)
      .pipe(map(response => response.data || []));
  }

  createReview(reviewData: { appointment: string; doctor: string; rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/reviews`, reviewData);
  }

  getPendingDoctors(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/admin/doctors/pending`)
      .pipe(map(response => response.data || []));
  }

  approveDoctor(doctorId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/approve-doctor/${doctorId}`, {});
  }

  deactivateDoctor(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/deactivate-doctor/${id}`, {});
  }

  reactivateDoctor(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/reactivate-doctor/${id}`, {});
  }

  deactivateUser(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/deactivate-user/${id}`, {});
  }

  reactivateUser(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/reactivate-user/${id}`, {});
  }

  getPatients(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/patients`)
      .pipe(map(response => response.data || []));
  }

  getAppointments(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/appointments`)
      .pipe(map(response => response.data || []));
  }

  getSchedules(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/schedules`)
      .pipe(map(response => response.data || []));
  }

  createSchedule(payload: {
    doctor: string;
    date: string;
    timeSlots: Array<{ startTime: string; endTime: string; isAvailable?: boolean }>;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/schedules`, payload);
  }

  updateSchedule(
    scheduleId: string,
    payload: {
      date?: string;
      timeSlots?: Array<{ startTime: string; endTime: string; isAvailable?: boolean }>;
    }
  ): Observable<any> {
    return this.http.put(`${this.baseUrl}/schedules/${scheduleId}`, payload);
  }

  deleteSchedule(scheduleId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/schedules/${scheduleId}`);
  }

  submitContactMessage(messageData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contact`, messageData);
  }

  getContactMessages(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/contact`)
      .pipe(map(response => response.data || []));
  }

  markMessageAsRead(messageId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/contact/${messageId}/read`, {});
  }

  rejectDoctorLocally(doctorId: string): void {
    const ids = this.readIdSet(this.rejectedDoctorsKey);
    ids.add(doctorId);
    localStorage.setItem(this.rejectedDoctorsKey, JSON.stringify(Array.from(ids)));
  }

  deactivateDoctorLocally(doctorId: string): void {
    const ids = this.readIdSet(this.deactivatedDoctorsKey);
    ids.add(doctorId);
    localStorage.setItem(this.deactivatedDoctorsKey, JSON.stringify(Array.from(ids)));
  }

  reactivateDoctorLocally(doctorId: string): void {
    const ids = this.readIdSet(this.deactivatedDoctorsKey);
    ids.delete(doctorId);
    localStorage.setItem(this.deactivatedDoctorsKey, JSON.stringify(Array.from(ids)));
  }

  clearRejectedDoctorLocally(doctorId: string): void {
    const ids = this.readIdSet(this.rejectedDoctorsKey);
    ids.delete(doctorId);
    localStorage.setItem(this.rejectedDoctorsKey, JSON.stringify(Array.from(ids)));
  }

  getDoctorModerationStatus(doctorId: string): 'rejected' | 'deactivated' | null {
    if (this.readIdSet(this.rejectedDoctorsKey).has(doctorId)) {
      return 'rejected';
    }

    if (this.readIdSet(this.deactivatedDoctorsKey).has(doctorId)) {
      return 'deactivated';
    }

    return null;
  }

  private isDoctorModeratedOut(doctorId: string): boolean {
    return !!doctorId && this.getDoctorModerationStatus(doctorId) !== null;
  }

  private readIdSet(storageKey: string): Set<string> {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return new Set<string>();
    }

    try {
      return new Set<string>(JSON.parse(rawValue) as string[]);
    } catch {
      localStorage.removeItem(storageKey);
      return new Set<string>();
    }
  }
}
