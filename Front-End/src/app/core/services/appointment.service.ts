import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  getPatientAppointments(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/patient`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          if (error.status === 404) {
            return of([]);
          }

          throw error;
        })
      );
  }

  createAppointment(appointment: {
    doctor: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
    service?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}`, appointment);
  }

  cancelAppointment(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { status: 'cancelled' });
  }

  deleteAppointment(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getDoctorAppointments(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.baseUrl}/doctor`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          if (error.status === 404) {
            return of([]);
          }

          throw error;
        })
      );
  }

  updateAppointmentStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, { status });
  }

  updateAppointment(id: string, data: {
    date?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    status?: string;
    notes?: string;
    rejectionReason?: string;
    proposedDate?: string;
    proposedStartTime?: string;
    proposedEndTime?: string;
    proposedReason?: string;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }
}
