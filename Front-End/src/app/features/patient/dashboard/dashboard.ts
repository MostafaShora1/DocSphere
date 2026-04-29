import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';

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
  payment?: {
    status: string;
    paymentMethod?: string | null;
  } | null;
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
  }
  | null;

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private readonly passwordPattern = /^.{6,}$/;

  user: User | null = null;
  appointments: DashboardAppointment[] = [];
  doctors: any[] = [];

  passwordLoading = false;
  passwordError = '';
  passwordSuccess = '';
  readonly passwordForm;

  // payment UX state (template bindings)
  payBusyAppointmentId: string | null = null;

  stripeModalOpen = false;
  stripeProcessing = false;
  stripeError = '';
  stripePayment: StripePaymentState = null;

  private stripe: any = null;
  private stripeCardElement: any = null;
  private stripePublicKey: string | null = null;

  private stripeScriptLoaded = false;
  private stripeScriptLoading = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private paymentService: PaymentService
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
            payment
          } satisfies DashboardAppointment;
        });
    });
  }

  getDoctorName(id: string): string {
    const doc = this.doctors.find(d => d.id === id || d.id === String(id));
    return doc ? doc.name : 'Unknown';
  }

  go(): void {
    this.router.navigate(['/services']);
  }

  cancelApp(id: string): void {
    this.appointmentService.cancelAppointment(id).subscribe(() => {
      this.loadAppointments();
    });
  }

  acceptReschedule(id: string): void {
    this.appointmentService.updateAppointmentStatus(id, 'confirmed').subscribe(() => {
      this.loadAppointments();
    });
  }

  cancelRescheduleProposal(id: string): void {
    this.appointmentService.updateAppointmentStatus(id, 'cancelled').subscribe(() => {
      this.loadAppointments();
    });
  }

  payCash(appointmentId: string): void {
    if (this.payBusyAppointmentId) return;

    this.payBusyAppointmentId = appointmentId;
    this.stripeError = '';

    this.paymentService.createCashPayment(appointmentId).then(() => {
      this.loadAppointments();
    }).catch((e: any) => {
      this.stripeError = e?.error?.message || 'Cash payment failed.';
    }).finally(() => {
      this.payBusyAppointmentId = null;
    });
  }

  async openStripePayment(appointmentId: string): Promise<void> {
    if (this.payBusyAppointmentId) return;

    this.payBusyAppointmentId = appointmentId;
    this.stripeError = '';
    this.stripeProcessing = false;

    try {
      const [publishableKey, intent] = await Promise.all([
        this.paymentService.getStripePublicKey(),
        this.paymentService.createStripePaymentIntent(appointmentId)
      ]);

      this.stripePublicKey = publishableKey;
      this.stripePayment = {
        clientSecret: intent.clientSecret,
        paymentId: intent.paymentId
      };

      this.stripeModalOpen = true;

      // 👇 استنى الـ modal يترسم
      await new Promise(resolve => setTimeout(resolve, 500));

      // 👇 بعد كده اعمل mount
      await this.mountStripeCard().catch(() => {
        this.stripeError = 'Stripe initialization failed. Try again.';
      });
    } catch (e: any) {
      this.stripeError = e?.error?.message || 'Failed to initialize Stripe payment.';
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

    const element = document.querySelector('#card-element');

    if (!element) {
      console.error('❌ card-element NOT FOUND');
      throw new Error('Element not found');
    }

    const w = window as any;
    this.stripe = w.Stripe(this.stripePublicKey);

    const elements = this.stripe.elements();
    this.stripeCardElement?.unmount?.();

    this.stripeCardElement = elements.create('card');
    this.stripeCardElement.mount('#card-element');
  }

  async confirmStripePayment(): Promise<void> {
    if (!this.stripePayment || !this.stripeCardElement || !this.stripe) return;

    this.stripeProcessing = true;
    this.stripeError = '';

    try {
      const result = await this.stripe.confirmCardPayment(
        this.stripePayment.clientSecret,
        { payment_method: { card: this.stripeCardElement } }
      );

      if (result?.error) {
        this.stripeError = result.error.message || 'Payment failed.';
        return;
      }

      await this.paymentService.verifyPayment(this.stripePayment.paymentId);
      this.loadAppointments();

      this.stripeModalOpen = false;
      this.stripePayment = null;
    } catch (e: any) {
      this.stripeError = e?.error?.message || 'Stripe payment failed.';
    } finally {
      this.stripeProcessing = false;
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
}
