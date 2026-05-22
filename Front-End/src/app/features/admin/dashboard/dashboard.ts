import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { DoctorService } from '../../../core/services/doctor.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  activeTab: 'overview' | 'pending' | 'doctors' | 'patients' | 'appointments' | 'messages' = 'overview';

  loading = false;
  approvingDoctorId = '';
  deactivatingDoctorId = '';
  deactivatingUserId = '';

  users: any[] = [];
  patients: any[] = [];
  doctors: any[] = [];
  pendingDoctors: any[] = [];
  appointments: any[] = [];
  messages: any[] = [];

  totalDoctors = 0;
  totalPatients = 0;
  totalAppointments = 0;
  pendingApprovals = 0;
  unreadMessages = 0;

  constructor(
    private apiService: ApiService,
    private doctorService: DoctorService
  ) { }

  ngOnInit() {
    this.loadDashboard();
  }

  setTab(tab: 'overview' | 'pending' | 'doctors' | 'patients' | 'appointments' | 'messages') {
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

    this.apiService.getContactMessages().subscribe({
      next: messages => {
        this.messages = messages;
        this.unreadMessages = messages.filter(m => m.status === 'unread').length;
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
    if (!doctorId || this.deactivatingDoctorId) return;

    this.deactivatingDoctorId = doctorId;
    this.apiService.deactivateDoctor(doctorId).subscribe({
      next: () => {
        this.apiService.deactivateDoctorLocally(doctorId);
        this.doctors = this.doctors.map(doctor =>
          doctor.id === doctorId
            ? { ...doctor, isActive: false, moderationStatus: 'deactivated' }
            : doctor
        );
        this.totalDoctors = this.doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
        this.deactivatingDoctorId = '';
      },
      error: () => {
        this.deactivatingDoctorId = '';
      }
    });
  }

  reactivateDoctor(doctorId: string) {
    if (!doctorId || this.deactivatingDoctorId) return;

    this.deactivatingDoctorId = doctorId;
    this.apiService.reactivateDoctor(doctorId).subscribe({
      next: () => {
        this.apiService.reactivateDoctorLocally(doctorId);
        this.doctors = this.doctors.map(doctor =>
          doctor.id === doctorId
            ? { ...doctor, isActive: true, moderationStatus: doctor.isApproved ? 'approved' : 'pending' }
            : doctor
        );
        this.totalDoctors = this.doctors.filter(doctor => doctor.isApproved && doctor.isActive !== false).length;
        this.deactivatingDoctorId = '';
      },
      error: () => {
        this.deactivatingDoctorId = '';
      }
    });
  }

  deactivateUser(userId: string) {
    if (!userId || this.deactivatingUserId === userId) return;

    const originalUserId = this.deactivatingUserId;
    this.deactivatingUserId = userId;
    
    this.apiService.deactivateUser(userId).subscribe({
      next: (response) => {
        const updatedUser = response.data;
        this.users = this.users.map(u => u._id === userId ? { ...u, isActive: false } : u);
        this.patients = this.patients.map(p => {
          if (p.user?._id === userId) {
            return { ...p, user: { ...p.user, isActive: false } };
          }
          return p;
        });
        
        this.doctors = this.doctors.map(d => {
          if (d.userId === userId) {
            return { ...d, isActive: false, moderationStatus: 'deactivated' };
          }
          return d;
        });

        this.deactivatingUserId = originalUserId;
      },
      error: (err) => {
        console.error('Error deactivating user:', err);
        this.deactivatingUserId = originalUserId;
      }
    });
  }

  reactivateUser(userId: string) {
    if (!userId || this.deactivatingUserId === userId) return;

    const originalUserId = this.deactivatingUserId;
    this.deactivatingUserId = userId;

    this.apiService.reactivateUser(userId).subscribe({
      next: (response) => {
        // Update local state
        this.users = this.users.map(u => u._id === userId ? { ...u, isActive: true } : u);
        this.patients = this.patients.map(p => {
          if (p.user?._id === userId) {
            return { ...p, user: { ...p.user, isActive: true } };
          }
          return p;
        });

        // Also update doctors list if this user is a doctor
        this.doctors = this.doctors.map(d => {
          if (d.userId === userId) {
            return { ...d, isActive: true, moderationStatus: d.isApproved ? 'approved' : 'pending' };
          }
          return d;
        });

        this.deactivatingUserId = originalUserId;
      },
      error: (err) => {
        console.error('Error reactivating user:', err);
        this.deactivatingUserId = originalUserId;
      }
    });
  }

  markAsRead(messageId: string) {
    this.apiService.markMessageAsRead(messageId).subscribe({
      next: () => {
        this.messages = this.messages.map(m =>
          m._id === messageId ? { ...m, status: 'read' } : m
        );
        this.unreadMessages = this.messages.filter(m => m.status === 'unread').length;
      }
    });
  }
}
