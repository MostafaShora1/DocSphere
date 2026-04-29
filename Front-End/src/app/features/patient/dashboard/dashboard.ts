import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';

interface DashboardAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  day: string;
  time: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {

  user: User | null = null;
  appointments: DashboardAppointment[] = [];

  doctors: any[] = [];

  constructor(
    private router: Router,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadDoctors();
    this.loadAppointments();
  }

  loadUser() {
    const data = localStorage.getItem('currentUser');

    if (!data) {
      this.router.navigate(['/login']);
      return;
    }

    const u = JSON.parse(data);

    if (u.role !== 'patient') {
      this.router.navigate(['/login']);
      return;
    }

    this.user = u;
  }

  loadDoctors() {
    this.doctorService.getDoctors().subscribe(doctors => {
      this.doctors = doctors;
    });
  }

  loadAppointments() {
    this.appointmentService.getPatientAppointments().subscribe((appointments: any[]) => {
      this.appointments = appointments
        .filter(appointment => appointment.status !== 'cancelled')
        .map(appointment => ({
          id: appointment._id,
          doctorId: appointment.doctor?._id || appointment.doctor,
          doctorName: appointment.doctor?.user?.name || appointment.doctor?.name || 'Unknown',
          day: new Date(appointment.appointmentDate).toLocaleDateString(),
          time: new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: appointment.status
        }));
    });
  }

  getDoctorName(id: string): string {
    const doc = this.doctors.find(d => d.id === id || d.id === String(id));
    return doc ? doc.name : 'Unknown';
  }

  cancelApp(id: string) {
    this.appointmentService.cancelAppointment(id).subscribe(() => {
      this.loadAppointments();
    });
  }

  go() {
    this.router.navigate(['/services']);
  }
}