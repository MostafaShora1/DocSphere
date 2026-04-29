import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ApiService } from '../../../core/services/api.service';

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private readonly passwordPattern = /^.{6,}$/;

  activeSection: 'overview' | 'appointments' | 'schedule' | 'profile' | 'security' = 'overview';

  currentUser: any = null;
  doctor: any = null;
  appointments: any[] = [];
  schedules: any[] = [];
  loading = false;
  scheduleLoading = false;
  scheduleSaving = false;
  scheduleError = '';
  scheduleSuccess = '';
  passwordLoading = false;
  passwordError = '';
  passwordSuccess = '';
  
  // Reject modal
  showRejectModal = false;
  selectedAppointment: any = null;
  rejectReason = '';

  readonly scheduleForm;
  readonly passwordForm;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private apiService: ApiService,
    private router: Router
  ) {
    this.scheduleForm = this.fb.group({
      date: ['', [Validators.required]],
      timeSlots: this.fb.array([
        this.createTimeSlotGroup(),
        this.createTimeSlotGroup()
      ])
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(this.passwordPattern)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDoctorDashboard();
  }

  setSection(section: 'overview' | 'appointments' | 'schedule' | 'profile' | 'security') {
    if (!this.isApproved && section !== 'profile' && section !== 'overview' && section !== 'security') {
      return;
    }

    this.activeSection = section;
  }

  get timeSlots(): FormArray {
    return this.scheduleForm.get('timeSlots') as FormArray;
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
          this.loadSchedules();
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
          patientEmail: appointment.patient?.user?.email || '',
          status: appointment.status || 'pending',
          createdAt: appointment.createdAt,
          appointmentDate: appointment.date || appointment.appointmentDate || null,
          startTime: appointment.startTime || '',
          endTime: appointment.endTime || '',
          reason: appointment.reason || ''
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // Confirm appointment
  confirmAppointment(appointmentId: string) {
    this.appointmentService.updateAppointmentStatus(appointmentId, 'confirmed').subscribe({
      next: () => {
        this.loadAppointments();
      },
      error: error => {
        console.error('Failed to confirm appointment:', error);
      }
    });
  }

  // Reject appointment
  rejectAppointment(appointmentId: string, reason: string) {
    this.appointmentService.updateAppointment(appointmentId, {
      status: 'rejected',
      rejectionReason: reason
    }).subscribe({
      next: () => {
        this.loadAppointments();
      },
      error: error => {
        console.error('Failed to reject appointment:', error);
      }
    });
  }

  private loadSchedules() {
    if (!this.doctor?.id) {
      return;
    }

    this.scheduleLoading = true;

    this.apiService.getSchedules().subscribe({
      next: schedules => {
        this.schedules = schedules
          .filter(schedule => {
            const scheduleDoctorId =
              schedule.doctor?._id ||
              schedule.doctor?.id ||
              schedule.doctor;

            return scheduleDoctorId === this.doctor.id;
          })
          .sort((a, b) => +new Date(a.date) - +new Date(b.date));
        this.scheduleLoading = false;
      },
      error: () => {
        this.scheduleLoading = false;
        this.scheduleError = 'Failed to load schedule.';
      }
    });
  }

  addTimeSlot() {
    this.timeSlots.push(this.createTimeSlotGroup());
  }

  removeTimeSlot(index: number) {
    if (this.timeSlots.length === 1) {
      return;
    }

    this.timeSlots.removeAt(index);
  }

  saveSchedule() {
    if (!this.doctor?.id) {
      this.scheduleError = 'Doctor profile is not ready yet.';
      return;
    }

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.scheduleError = 'Please complete the schedule form first.';
      this.scheduleSuccess = '';
      return;
    }

    const normalizedSlots = this.timeSlots.getRawValue()
      .map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true
      }))
      .filter((slot: any) => slot.startTime && slot.endTime)
      .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

    this.scheduleSaving = true;
    this.scheduleError = '';
    this.scheduleSuccess = '';

    this.apiService.createSchedule({
      doctor: this.doctor.id,
      date: `${this.scheduleForm.get('date')?.value || ''}`,
      timeSlots: normalizedSlots
    }).subscribe({
      next: () => {
        this.scheduleSaving = false;
        this.scheduleSuccess = 'Schedule saved successfully.';
        this.scheduleForm.reset();
        this.timeSlots.clear();
        this.addTimeSlot();
        this.addTimeSlot();
        this.loadSchedules();
      },
      error: error => {
        this.scheduleSaving = false;
        this.scheduleError = error?.error?.message || 'Failed to save schedule.';
      }
    });
  }

  deleteSchedule(scheduleId: string) {
    this.scheduleError = '';
    this.scheduleSuccess = '';

    this.apiService.deleteSchedule(scheduleId).subscribe({
      next: () => {
        this.scheduleSuccess = 'Schedule removed successfully.';
        this.loadSchedules();
      },
      error: error => {
        this.scheduleError = error?.error?.message || 'Failed to remove schedule.';
      }
    });
  }

  async updatePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.passwordError = 'Please review the password fields.';
      this.passwordSuccess = '';
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.passwordLoading = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    try {
      await this.authService.updatePassword(currentPassword!, newPassword!);
      this.passwordSuccess = 'Password updated successfully.';
      this.passwordForm.reset();
    } catch (error: any) {
      this.passwordError = error?.error?.message || 'Failed to update password.';
    } finally {
      this.passwordLoading = false;
    }
  }

  formatScheduleDate(date: string): string {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Show reject dialog
  showRejectDialog(appointment: any) {
    this.selectedAppointment = appointment;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  // Close reject dialog
  closeRejectDialog() {
    this.showRejectModal = false;
    this.selectedAppointment = null;
    this.rejectReason = '';
  }

  // Submit rejection
  submitReject() {
    if (!this.selectedAppointment || !this.rejectReason.trim()) {
      return;
    }

    this.rejectAppointment(this.selectedAppointment.id, this.rejectReason.trim());
    this.closeRejectDialog();
  }

  private createTimeSlotGroup() {
    return this.fb.group({
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]]
    });
  }
}
