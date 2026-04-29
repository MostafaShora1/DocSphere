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


interface DoctorSchedule {
  _id: string;
  doctor: string | { _id?: string; id?: string };
  date: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>;
}

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
  schedules: DoctorSchedule[] = [];
  doctorSchedules: DoctorSchedule[] = [];
  availableDates: string[] = [];

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
  ) { }

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
      services: this.apiService.getServices(),
      schedules: this.apiService.getSchedules()
    }).subscribe({
      next: ({ doctors, services, schedules }) => {
        this.doctors = doctors;
        this.allServices = services;
        this.schedules = schedules;

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

        // 👇 ضيف دول تحتها مباشرة
        if (this.selectedDoctorId) {
          this.onDoctorChange(false);
        }

        if (this.selectedDate) {
          this.onDateChange();
        }
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Failed to load booking data.';
      }
    });
  }

  onDoctorChange(resetService = true) {
    this.services = this.allServices.filter(service => service.doctorId === this.selectedDoctorId);
    this.doctorSchedules = this.schedules
      .filter(schedule => this.resolveDoctorId(schedule.doctor) === this.selectedDoctorId)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    this.availableDates = this.doctorSchedules.map(schedule => this.toDateInputValue(schedule.date));

    if (resetService) {
      this.selectedServiceId = '';
    }

    this.selectedDate = '';
    this.selectedTime = '';
    this.availableTimes = [];
    this.message = '';
    this.errorMsg = '';
  }

  onServiceChange() {
    this.selectedTime = '';
    this.availableTimes = [];
    this.message = '';
    this.errorMsg = '';
  }

  onDateChange() {
    const selectedSchedule = this.doctorSchedules.find(
      schedule => this.toDateInputValue(schedule.date) === this.selectedDate
    );

    this.availableTimes = (selectedSchedule?.timeSlots || [])
      .filter(slot => slot.isAvailable === true)
      .map(slot => slot.startTime);
    this.selectedTime = '';
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

    const appointmentData: any = {
      doctor: this.selectedDoctorId,
      date: appointmentDate.toISOString(),
      startTime: this.toTimeString(appointmentDate),
      endTime: this.toTimeString(endDate),
      reason: this.notes || this.selectedService.name
    };

    // Include service ID if selected from services page
    if (this.selectedServiceId) {
      appointmentData.service = this.selectedServiceId;
    }

    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: () => {
        this.booking = false;
        this.message = 'Appointment booked successfully.';
        const savedDoctor = this.selectedDoctorId;
        const savedDate = this.selectedDate;

        this.resetForm();

        this.selectedDoctorId = savedDoctor;

        // 👇 مهم جدًا
        this.onDoctorChange(false);

        this.selectedDate = savedDate;

        // 👇 أهم سطر
        this.onDateChange();

        this.loadMyAppointments();
        this.loadData();
      },
      error: error => {
        this.booking = false;
        this.errorMsg = error?.error?.message || 'Booking failed.';

        if (this.errorMsg.toLowerCase().includes('time slot')) {
          this.loadData();
        }
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
            status: appointment.status || 'pending',
            rejectionReason: appointment.rejectionReason || null
          }));
      }
    });
  }

  // Re-book after doctor rejected
  rebookAppointment(appointment: any) {
    // Pre-fill the form with the rejected appointment's details
    if (appointment.doctorName) {
      const doctor = this.doctors.find(d => d.name === appointment.doctorName);
      if (doctor) {
        this.selectedDoctorId = doctor.id;
        this.onDoctorChange(false);
      }
    }
    this.notes = appointment.serviceName;
    this.message = 'Please select a new date and time for your appointment.';
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

  private resolveDoctorId(doctor: DoctorSchedule['doctor']): string {
    if (typeof doctor === 'string') {
      return doctor;
    }

    return doctor?._id || doctor?.id || '';
  }

  private toDateInputValue(date: string): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private toTimeString(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
