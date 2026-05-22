import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { Service } from '../../../shared/models/service.model';
import { Doctor } from '../../../shared/models/doctor.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

declare var Swal: any;

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslateModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css']
})
export class ServicesComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  doctors: Doctor[] = [];
  specialties: string[] = [];

  searchTerm = '';
  selectedSpecialty = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;

    forkJoin({
      services: this.apiService.getServices(),
      doctors: this.apiService.getDoctors()
    }).subscribe({
      next: ({ services, doctors }) => {
        this.services = services;
        this.doctors = doctors;
        this.specialties = Array.from(new Set(doctors.map(doctor => doctor.specialty).filter(Boolean))).sort();
        this.filterServices();
        this.loading = false;
      },
      error: () => {
        this.services = [];
        this.filteredServices = [];
        this.loading = false;
      }
    });
  }

  filterServices() {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    this.filteredServices = this.services.filter(service => {
      const doctor = this.doctors.find(d => d.id === service.doctorId);

      const matchesSearch =
        !normalizedSearch ||
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.description.toLowerCase().includes(normalizedSearch) ||
        (doctor?.name || '').toLowerCase().includes(normalizedSearch);

      const matchesSpecialty =
        !this.selectedSpecialty ||
        doctor?.specialty === this.selectedSpecialty;

      return service.isActive && matchesSearch && matchesSpecialty;
    });
  }

  getDoctorName(id: string): string {
    const doctor = this.doctors.find(d => d.id === id);
    return doctor ? doctor.name : 'Doctor';
  }

  getDoctorSpecialty(id: string): string {
    const doctor = this.doctors.find(d => d.id === id);
    return doctor ? doctor.specialty : '';
  }

  bookService(serviceId: string) {
    const rawUser = localStorage.getItem('currentUser');

    if (!rawUser) {
      Swal.fire({
        title: this.translate.instant('SERVICES.BOOKING_ERROR_TITLE'),
        text: this.translate.instant('SERVICES.LOGIN_REQUIRED_MSG'),
        icon: 'warning',
        confirmButtonText: this.translate.instant('SERVICES.OK'),
        confirmButtonColor: '#145245'
      });
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(rawUser);

    if (user.role !== 'patient') {
      Swal.fire({
        title: this.translate.instant('SERVICES.BOOKING_ERROR_TITLE'),
        text: this.translate.instant('SERVICES.PATIENT_ONLY_MSG'),
        icon: 'error',
        confirmButtonText: this.translate.instant('SERVICES.OK'),
        confirmButtonColor: '#145245'
      });
      return;
    }

    this.router.navigate(['/patient/appointments'], {
      queryParams: {
        serviceId
      }
    });
  }
}
