import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  activeSection: 'overview' | 'appointments' | 'profile' = 'overview';

  currentUser: any = null;
  doctor: any = null;
  appointments: any[] = [];
  loading = false;

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDoctorDashboard();
  }

  setSection(section: 'overview' | 'appointments' | 'profile') {
    if (!this.isApproved && section !== 'profile' && section !== 'overview') {
      return;
    }

    this.activeSection = section;
  }

  get myAppointments(): any[] {
    return this.appointments;
  }

  get pendingCount(): number {
    return this.myAppointments.filter(appointment => appointment.status === 'pending').length;
  }

  get confirmedCount(): number {
    return this.myAppointments.filter(appointment => appointment.status === 'confirmed').length;
  }

  get isApproved(): boolean {
    return !!this.doctor?.isApproved && this.doctor?.isActive !== false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadDoctorDashboard() {
    this.loading = true;

    this.doctorService.getAllDoctors().subscribe({
      next: doctors => {
        this.doctor = doctors.find(doctor => doctor.userId === this.currentUser?.id) || null;

        if (this.doctor?.isApproved && this.doctor?.isActive !== false) {
          this.loadAppointments();
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadAppointments() {
    this.appointmentService.getDoctorAppointments().subscribe({
      next: appointments => {
        this.appointments = appointments.map(appointment => ({
          id: appointment._id,
          patientName: appointment.patient?.firstName
            ? `${appointment.patient.firstName} ${appointment.patient.lastName || ''}`.trim()
            : 'Patient',
          status: appointment.status || 'pending',
          createdAt: appointment.createdAt,
          appointmentDate: appointment.date || appointment.appointmentDate || null
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
