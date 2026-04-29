import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Doctor } from '../../shared/models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  constructor(private apiService: ApiService) {}

  getDoctors(): Observable<Doctor[]> {
    return this.apiService.getDoctors();
  }

  getAllDoctors(): Observable<Doctor[]> {
    return this.apiService.getDoctors(true);
  }

  getDoctorById(id: string | number): Observable<Doctor | undefined> {
    return this.apiService.getDoctorById(id).pipe(
      map(doctor => doctor)
    );
  }
}
