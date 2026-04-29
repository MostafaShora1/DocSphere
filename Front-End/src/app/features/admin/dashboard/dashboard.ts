import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { DoctorService } from '../../../core/services/doctor.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  activeTab: 'overview' | 'pending' | 'doctors' | 'patients' | 'appointments' = 'overview';

  loading = false;
  approvingDoctorId = '';

  users: any[] = [];
  patients: any[] = [];
  doctors: any[] = [];
  pendingDoctors: any[] = [];
  appointments: any[] = [];

  totalDoctors = 0;
  totalPatients = 0;
  totalAppointments = 0;
  pendingApprovals = 0;

  constructor(
    private apiService: ApiService,
    private doctorService: DoctorService
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  setTab(tab: 'overview' | 'pending' | 'doctors' | 'patients' | 'appointments') {
    this.activeTab = tab;
  }

  loadDashboard() {
    this.loading = true;

    this.apiService.getAdminUsers().subscribe({
      next: users => {
        this.users = users;
        this.totalPatients = users.filter(user => user.role === 'patient').length;
      }
    });

    this.doctorService.getAllDoctors().subscribe({
      next: doctors => {
        this.doctors = doctors;
        this.totalDoctors = doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
      }
    });

    this.apiService.getPendingDoctors().subscribe({
      next: doctors => {
        this.pendingDoctors = doctors;
        this.pendingApprovals = doctors.length;
      }
    });

    this.apiService.getPatients().subscribe({
      next: patients => {
        this.patients = patients;
      }
    });

    this.apiService.getAppointments().subscribe({
      next: appointments => {
        this.appointments = appointments;
        this.totalAppointments = appointments.length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  approveDoctor(doctorId: string) {
    if (!doctorId || this.approvingDoctorId) {
      return;
    }

    this.approvingDoctorId = doctorId;
    this.apiService.approveDoctor(doctorId).subscribe({
      next: () => {
        this.apiService.clearRejectedDoctorLocally(doctorId);
        const pendingDoctor = this.pendingDoctors.find(doctor => doctor._id === doctorId);
        if (pendingDoctor) {
          this.pendingDoctors = this.pendingDoctors.filter(doctor => doctor._id !== doctorId);
          this.doctors = [
            {
              id: pendingDoctor._id,
              userId: pendingDoctor.user?._id,
              name: pendingDoctor.fullName || pendingDoctor.user?.name || 'Doctor',
              specialty: pendingDoctor.specialty?.name || 'General',
              email: pendingDoctor.user?.email || '',
              isApproved: true,
              isActive: true,
              moderationStatus: 'approved'
            },
            ...this.doctors.filter(doctor => doctor.id !== pendingDoctor._id)
          ];
        }

        this.pendingApprovals = this.pendingDoctors.length;
        this.totalDoctors = this.doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
        this.approvingDoctorId = '';
      },
      error: () => {
        this.approvingDoctorId = '';
      }
    });
  }

  rejectDoctor(doctorId: string) {
    this.apiService.rejectDoctorLocally(doctorId);
    this.pendingDoctors = this.pendingDoctors.filter(doctor => doctor._id !== doctorId);
    this.pendingApprovals = this.pendingDoctors.length;
    this.doctors = this.doctors.map(doctor =>
      doctor.id === doctorId
        ? { ...doctor, moderationStatus: 'rejected', isActive: false }
        : doctor
    );
  }

  deactivateDoctor(doctorId: string) {
    this.apiService.deactivateDoctorLocally(doctorId);
    this.doctors = this.doctors.map(doctor =>
      doctor.id === doctorId
        ? { ...doctor, isActive: false, moderationStatus: 'deactivated' }
        : doctor
    );
    this.totalDoctors = this.doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
  }

  reactivateDoctor(doctorId: string) {
    this.apiService.reactivateDoctorLocally(doctorId);
    this.doctors = this.doctors.map(doctor =>
      doctor.id === doctorId
        ? { ...doctor, isActive: true, moderationStatus: doctor.isApproved ? 'approved' : 'pending' }
        : doctor
    );
    this.totalDoctors = this.doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
  }
}
