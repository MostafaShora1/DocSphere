import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ApiService } from '../../../core/services/api.service';

const passwordMatchValidator: ValidatorFn = (
  control
): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword) return null;
  return newPassword === confirmPassword
    ? null
    : { passwordMismatch: true };
};

interface DashboardAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  day: string;
  time: string;
  status: string;

  // reschedule proposal
  isRescheduleProposal: boolean;

  // payment for template compatibility
  paymentStatus?: string;
  paymentMethod?: string | null;
  paymentId?: string | null;
  payment?: {
    _id?: string;
    status: string;
    paymentMethod?: string | null;
  } | null;

  // review
  review?: boolean;
  rating?: number;
  comment?: string;
  
  // added fields
  reason?: string;
  rejectionReason?: string;
  serviceName?: string;
  doctorSpecialty?: string;
  fullDate?: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type StripePaymentState =
  | {
    clientSecret: string;
    paymentId: string;
    amount: number;
    currency: string;
  }
  | null;

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private readonly passwordPattern = /^.{6,}$/;

  user: User | null = null;
  appointments: DashboardAppointment[] = [];
  doctors: any[] = [];
  loading = false;

  passwordLoading = false;
  passwordError = '';
  passwordSuccess = '';
  readonly passwordForm;

  // payment UX state (template bindings)
  payBusyAppointmentId: string | null = null;

  stripeModalOpen = false;
  reviewLoading = false;
  
  // Review Prompt Modal
  showReviewModal = false;
  pendingReviewAppointment: DashboardAppointment | null = null;
  
  stripeProcessing = false;
  stripeError = '';
  stripePayment: StripePaymentState = null;
  paymentSuccessMessage = '';

  private stripe: any = null;
  private stripeCardElement: any = null;
  private stripePublicKey: string | null = null;

  stripeScriptLoaded = false;
  stripeScriptLoading = false;

  @ViewChild('cardElement', { static: false })
  cardElementRef?: ElementRef<HTMLDivElement>;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            Validators.pattern(this.passwordPattern)
          ]
        ],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.loadUser();
    this.loadDoctors();
    this.loadAppointments();
  }

  private loadUser(): void {
    const data = localStorage.getItem('currentUser');
    if (!data) {
      this.router.navigate(['/login']);
      return;
    }

    const u = JSON.parse(data) as User;
    if (u.role !== 'patient') {
      this.router.navigate(['/login']);
      return;
    }

    this.user = u;
  }

  private loadDoctors(): void {
    this.doctorService.getDoctors().subscribe(doctors => {
      this.doctors = doctors;
    });
  }

  private loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getPatientAppointments().subscribe((apps: any[]) => {
      this.appointments = apps
        .filter(a => a.status !== 'cancelled')
        .map(a => {
          const dateValue = a.date || a.appointmentDate;
          const day = dateValue
            ? new Date(dateValue).toLocaleDateString()
            : 'N/A';

          const start = a.startTime || '';
          const end = a.endTime || '';
          const time =
            start && end ? `${start} - ${end}` : a.time || 'N/A';

          const payment = a.payment ?? null;

          return {
            id: a._id,
            doctorId: a.doctor?._id || a.doctor || '',
            doctorName: a.doctor?.user?.name || a.doctor?.name || 'Unknown',
            day,
            time,
            status: a.status || 'pending',
            isRescheduleProposal: !!a.isRescheduleProposal,
            paymentStatus: payment?.status,
            paymentMethod: payment?.paymentMethod ?? null,
            paymentId: payment?._id ?? null,
            payment,
            review: false,
            rating: undefined,
            comment: undefined,
            reason: a.reason,
            rejectionReason: a.rejectionReason,
            serviceName: a.service?.name || 'General Consultation',
            doctorSpecialty: a.doctor?.specialty?.name || 'Doctor',
            fullDate: dateValue ? new Date(dateValue) : undefined
          } satisfies DashboardAppointment;
        });

      this.loadReviews();
    });
  }


  private loadReviews(): void {
    // Load user's reviews to mark which appointments have been reviewed
    this.apiService.getMyReviews().subscribe({
      next: (reviews: any[]) => {
        reviews.forEach(review => {
          const reviewedAppointmentId =
            typeof review?.appointment === 'string'
              ? review.appointment
              : review?.appointment?._id;

          const appointment = this.appointments.find(a => a.id === reviewedAppointmentId);

          if (appointment) {
            appointment.review = true;
          }
        });
        
        // Check for review prompt after marking existing reviews
        this.checkForReviewReminder();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading reviews', err);
        this.loading = false;
      }
    });
  }

  getDoctorName(id: string): string {
    const doc = this.doctors.find(d => d.id === id || d.id === String(id));
    return doc ? doc.name : 'Unknown';
  }

  async acceptReschedule(id: string): Promise<void> {
    try {
      await firstValueFrom(this.appointmentService.updateAppointment(id, { status: 'confirmed' }));
      await this.loadAppointments();
    } catch (e) {
      console.error('Accept reschedule failed', e);
    }
  }

  async cancelRescheduleProposal(id: string): Promise<void> {
    try {
      await firstValueFrom(this.appointmentService.updateAppointment(id, { status: 'rejected' }));
      await this.loadAppointments();
    } catch (e) {
      console.error('Reject reschedule failed', e);
    }
  }

  async cancelApp(id: string): Promise<void> {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await firstValueFrom(this.appointmentService.cancelAppointment(id));
      await this.loadAppointments();
    } catch (e) {
      console.error('Cancel appointment failed', e);
    }
  }

  async payCash(id: string): Promise<void> {
    this.payBusyAppointmentId = id;
    try {
      await this.paymentService.createCashPayment(id, 'egp');
      this.paymentSuccessMessage = 'Cash payment recorded. Please pay at the clinic.';
      setTimeout(() => (this.paymentSuccessMessage = ''), 5000);
      await this.loadAppointments();
    } catch (e: any) {
      alert(e?.error?.message || 'Cash payment failed');
    } finally {
      this.payBusyAppointmentId = null;
    }
  }

  go(): void {
    this.router.navigate(['/services']);
  }

  setRating(appointment: DashboardAppointment, val: number): void {
    appointment.rating = val;
  }

  async openStripePayment(appointmentId: string): Promise<void> {
    if (this.payBusyAppointmentId) return;

    const appointment = this.appointments.find(a => a.id === appointmentId);

    console.log('[patient dashboard] openStripePayment appointmentId:', appointmentId);

    if (!appointment || appointment.status !== 'confirmed') {
      this.stripeError = 'Appointment must be confirmed before Stripe payment.';
      return;
    }

    // Prevent broken UI state
    this.payBusyAppointmentId = appointmentId;
    this.stripeError = '';
    this.stripeProcessing = false;

    try {
      // 1) Sync payment state first if we already have a paymentId
      if (appointment.paymentId) {
        const verifyRes = await this.paymentService.verifyPayment(appointment.paymentId);
        const isPaid = !!verifyRes?.isPaid || verifyRes?.status === 'paid';

        await this.loadAppointments();

        if (isPaid) {
          // already paid => don't open Stripe modal
          return;
        }
      }

      // 2) Create/Reuse Stripe payment intent (backend should reuse pending payment)
      const intent = await this.paymentService.createStripePaymentIntent(appointmentId);

      if (!intent?.clientSecret || !intent?.paymentId) {
        throw new Error('Stripe intent missing clientSecret/paymentId');
      }

      const publishableKey = await this.paymentService.getStripePublicKey();

      // Only open modal AFTER intent success
      this.stripePublicKey = publishableKey;
      this.stripePayment = {
        clientSecret: intent.clientSecret,
        paymentId: intent.paymentId,
        amount: intent.amount,
        currency: intent.currency
      };

      this.stripeModalOpen = true;

      // Ensure Angular renders the modal DOM
      this.cdr.detectChanges();

      await this.mountStripeCard();
    } catch (e: any) {
      this.stripeError =
        e?.error?.message || e?.message || 'Failed to initialize Stripe payment.';
      this.stripeModalOpen = false;
      this.stripePayment = null;
    } finally {
      this.payBusyAppointmentId = null;
    }
  }

  private async loadStripeScript(): Promise<void> {
    if (this.stripeScriptLoaded) return;

    if (this.stripeScriptLoading) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    this.stripeScriptLoading = true;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-stripe="true"]') as
        HTMLScriptElement | null;

      if (existing) {
        this.stripeScriptLoaded = true;
        this.stripeScriptLoading = false;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.setAttribute('data-stripe', 'true');

      script.onload = () => {
        this.stripeScriptLoaded = true;
        this.stripeScriptLoading = false;
        resolve();
      };

      script.onerror = () => {
        this.stripeScriptLoading = false;
        reject(new Error('Failed to load Stripe.js'));
      };

      document.head.appendChild(script);
    });
  }

  private async mountStripeCard(): Promise<void> {
    if (!this.stripePayment || !this.stripePublicKey) return;

    await this.loadStripeScript();

    if (!this.cardElementRef?.nativeElement) {
      console.error('❌ card-element NOT FOUND (ViewChild)');
      throw new Error('Element not found');
    }

    const mountTarget = this.cardElementRef.nativeElement;

    console.log('[patient dashboard] stripe mount: card-element found');

    const w = window as any;
    this.stripe = w.Stripe(this.stripePublicKey);

    const elements = this.stripe.elements();
    this.stripeCardElement?.unmount?.();

    this.stripeCardElement = elements.create('card');
    // mount to DOM node reference
    this.stripeCardElement.mount(mountTarget);

    console.log('[patient dashboard] stripe mount success');
  }

  async confirmStripePayment(): Promise<void> {
    if (!this.stripePayment || !this.stripeCardElement || !this.stripe) return;

    this.stripeProcessing = true;
    this.stripeError = '';

    try {
      console.log('[patient dashboard] confirmStripePayment paymentId:', this.stripePayment.paymentId);

      const result = await this.stripe.confirmCardPayment(
        this.stripePayment.clientSecret,
        { payment_method: { card: this.stripeCardElement } }
      );

      if (result?.error) {
        this.stripeError = result.error.message || 'Payment failed.';

        // Prevent broken state: sync backend payment status even on Stripe UI errors,
        // then update UI so retry/cancel/paid state is correct.
        try {
          const verifyRes = await this.paymentService.verifyPayment(this.stripePayment.paymentId);
          const isPaid = !!verifyRes?.isPaid || verifyRes?.status === 'paid';

          await this.loadAppointments();

          // If backend is already paid, close the modal and stop further retries
          if (isPaid) {
            this.stripeModalOpen = false;
            this.stripePayment = null;
          }
        } catch (verifyErr) {
          console.warn('[patient dashboard] verifyPayment after stripe error failed:', verifyErr);
          // Keep modal open to allow user retry (backend will govern eligibility)
        }

        return;
      }

      const verifyRes = await this.paymentService.verifyPayment(this.stripePayment.paymentId);

      // backend: { success: true, isPaid, status, data }
      const isPaid = !!verifyRes?.isPaid || verifyRes?.status === 'paid';

      if (!isPaid) {
        this.stripeError =
          verifyRes?.message ||
          `Payment verification failed (status: ${verifyRes?.status ?? 'unknown'}).`;
        return;
      }

      // Only after successful verification refresh appointments + enable review UI
      await this.loadAppointments();

      this.paymentSuccessMessage = `Payment of ${this.stripePayment.amount / 100} ${this.stripePayment.currency.toUpperCase()} successful!`;
      setTimeout(() => this.paymentSuccessMessage = '', 5000);

      this.stripeModalOpen = false;
      this.stripePayment = null;
    } catch (e: any) {
      this.stripeError = e?.error?.message || e?.message || 'Stripe payment failed.';
    } finally {
      this.stripeProcessing = false;
    }
  }

  async submitReview(appointmentId: string, doctorId: string): Promise<void> {
    const appointment = this.appointments.find(a => a.id === appointmentId) || this.pendingReviewAppointment;

    if (!appointment || !appointment.rating || !appointment.comment) return;

    this.reviewLoading = true;
    try {
      await firstValueFrom(this.apiService.createReview({
        appointment: appointment.id,
        doctor: doctorId,
        rating: appointment.rating,
        comment: appointment.comment
      }));

      appointment.review = true; // Mark as reviewed
      if (this.showReviewModal) {
        this.closeReviewModal();
      }
    } catch (error: any) {
      console.error('Review submission failed', error);
    } finally {
      this.reviewLoading = false;
    }
  }

  async updatePassword(): Promise<void> {
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
  checkForReviewReminder(): void {
    // Look for a paid, completed appointment that hasn't been reviewed yet
    const now = new Date();
    const reviewable = this.appointments.find(a => 
      a.paymentStatus === 'paid' && 
      !a.review && 
      a.fullDate && a.fullDate < now
    );

    if (reviewable && !sessionStorage.getItem('reviewPromptShown')) {
      this.pendingReviewAppointment = reviewable;
      this.showReviewModal = true;
      sessionStorage.setItem('reviewPromptShown', 'true');
    }
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.pendingReviewAppointment = null;
  }
}
