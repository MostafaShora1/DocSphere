import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../shared/models/doctor.model';
import { Service } from '../../../shared/models/service.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./appointments.css']
})
export class AppointmentsComponent implements OnInit {
  currentUser: any = null;

  doctors: Doctor[] = [];
  allServices: Service[] = [];
  services: Service[] = [];
  appointments: any[] = [];

  selectedDoctorId = '';
  selectedServiceId = '';
  selectedDate = '';
  selectedTime = '';
  notes = '';

  availableTimes: string[] = [];
  loading = false;
  booking = false;
  message = '';
  errorMsg = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser?.role !== 'patient') {
      return;
    }

    this.loadData();
    this.loadMyAppointments();
  }

  get selectedService(): Service | undefined {
    return this.services.find(service => service.id === this.selectedServiceId);
  }

  get canConfirm(): boolean {
    return !!(this.selectedDoctorId && this.selectedServiceId && this.selectedDate && this.selectedTime);
  }

  loadData() {
    this.loading = true;

    forkJoin({
      doctors: this.apiService.getDoctors(),
      services: this.apiService.getServices()
    }).subscribe({
      next: ({ doctors, services }) => {
        this.doctors = doctors;
        this.allServices = services;

        const preselectedServiceId = this.route.snapshot.queryParamMap.get('serviceId');
        if (preselectedServiceId) {
          const matchedService = services.find(service => service.id === preselectedServiceId);
          if (matchedService) {
            this.selectedDoctorId = matchedService.doctorId;
            this.onDoctorChange(false);
            this.selectedServiceId = matchedService.id;
            this.onServiceChange();
          }
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Failed to load booking data.';
      }
    });
  }

  onDoctorChange(resetService = true) {
    this.services = this.allServices.filter(service => service.doctorId === this.selectedDoctorId);

    if (resetService) {
      this.selectedServiceId = '';
    }

    this.selectedTime = '';
    this.availableTimes = [];
    this.message = '';
    this.errorMsg = '';
  }

  onServiceChange() {
    this.availableTimes = this.selectedService?.availableTimes || [];
    this.selectedTime = '';
    this.message = '';
    this.errorMsg = '';
  }

  confirmBooking() {
    if (!this.canConfirm || !this.selectedService) {
      return;
    }

    this.booking = true;
    this.message = '';
    this.errorMsg = '';

    const appointmentDate = new Date(`${this.selectedDate}T${this.selectedTime}`);
    const endDate = new Date(appointmentDate.getTime() + 30 * 60 * 1000);

    this.appointmentService.createAppointment({
      doctor: this.selectedDoctorId,
      date: appointmentDate.toISOString(),
      startTime: this.toTimeString(appointmentDate),
      endTime: this.toTimeString(endDate),
      reason: this.notes || this.selectedService.name
    }).subscribe({
      next: () => {
        this.booking = false;
        this.message = 'Appointment booked successfully.';
        this.resetForm();
        this.loadMyAppointments();
      },
      error: error => {
        this.booking = false;
        this.errorMsg = error?.error?.message || 'Booking failed.';
      }
    });
  }

  loadMyAppointments() {
    this.appointmentService.getPatientAppointments().subscribe({
      next: appointments => {
        this.appointments = appointments
          .filter(appointment => appointment.status !== 'cancelled')
          .map(appointment => ({
            id: appointment._id,
            doctorName: appointment.doctor?.fullName || appointment.doctor?.user?.name || 'Doctor',
            serviceName: appointment.reason || 'Consultation',
            day: appointment.date ? new Date(appointment.date).toLocaleDateString() : 'N/A',
            time: appointment.startTime || 'N/A',
            status: appointment.status || 'pending'
          }));
      }
    });
  }

  cancelAppointment(id: string) {
    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {
        this.loadMyAppointments();
      }
    });
  }

  private resetForm() {
    this.selectedDoctorId = '';
    this.selectedServiceId = '';
    this.selectedDate = '';
    this.selectedTime = '';
    this.notes = '';
    this.services = [];
    this.availableTimes = [];
  }

  private toTimeString(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
