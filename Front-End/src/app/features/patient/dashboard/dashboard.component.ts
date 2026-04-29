import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PaymentService, StripePaymentIntentResponse } from '../../../core/services/payment.service';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

interface Appointment {
  id: string;
  doctorId: any;
  doctorName: string;
  day: string;
  time: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isRescheduleProposal?: boolean;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDashboardComponent implements OnInit {

  appointments: Appointment[] = [];
  user: any = null;
  loading = false;
  payBusyAppointmentId: string | null = null;

  // Stripe
  stripeModalOpen = false;
  stripeProcessing = false;
  stripeError = '';
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  paymentElement: StripePaymentElement | null = null;
  currentPaymentAppointmentId: string | null = null;
  clientSecret: string | null = null;

  // Password change
  passwordLoading = false;
  passwordError = '';
  passwordSuccess = '';
  passwordForm!: FormGroup;

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value || '';
    const confirmPassword = control.get('confirmPassword')?.value || '';
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  };

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private paymentService: PaymentService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ✅ init form
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.passwordForm.setValidators(this.passwordMatchValidator);
    this.passwordForm.updateValueAndValidity();

    this.user = this.authService.getCurrentUser();
    this.loadAppointments();
  }

  // ================= APPOINTMENTS =================
  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getPatientAppointments().subscribe({
      next: (apps) => {
        this.appointments = apps.map(app => ({
          id: app._id,
          doctorId: app.doctor,
          doctorName: app.doctor?.name || 'Doctor',
          day: new Date(app.date).toLocaleDateString(),
          time: app.startTime,
          status: app.status,
          paymentStatus: app.payment?.status,
          paymentMethod: app.payment?.paymentMethod,
          isRescheduleProposal: app.isRescheduleProposal
        }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getDoctorName(doctorId: any): string {
    const app = this.appointments.find(a => String(a.doctorId) === String(doctorId));
    return app?.doctorName || 'Doctor';
  }

  // ================= PAYMENTS =================
  payCash(id: string): void {
    this.payBusyAppointmentId = id;
    this.paymentService.createCashPayment(id)
      .then(() => {
        this.loadAppointments();
        this.payBusyAppointmentId = null;
      })
      .catch(() => {
        this.payBusyAppointmentId = null;
      });
  }

  async openStripePayment(id: string): Promise<void> {
    this.currentPaymentAppointmentId = id;
    this.stripeModalOpen = true;
    this.stripeError = '';

    try {
      const stripeKey = await this.paymentService.getStripePublicKey();
      this.stripe = await loadStripe(stripeKey);

      if (!this.stripe) {
        this.stripeError = 'Stripe failed to load';
        return;
      }

      const res: StripePaymentIntentResponse = await this.paymentService.createStripePaymentIntent(id);
      this.clientSecret = res.clientSecret;

      if (this.clientSecret) {
        this.elements = this.stripe.elements({ clientSecret: this.clientSecret });
        this.paymentElement = this.elements.create('payment');
        this.paymentElement.mount('#card-element');
      }
    } catch (error: any) {
      this.stripeError = error?.error?.message || 'Payment setup failed';
    }
  }

  async confirmStripePayment(): Promise<void> {
    if (!this.stripe || !this.elements || !this.clientSecret) return;

    this.stripeProcessing = true;
    this.stripeError = '';

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.href
      },
      redirect: 'if_required'
    });

    if (error) {
      this.stripeError = error.message || 'Payment failed';
      this.stripeProcessing = false;
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      this.stripeModalOpen = false;
      this.loadAppointments();
    } else {
      this.stripeError = 'Payment not completed';
    }

    this.stripeProcessing = false;
  }

  // ✅ المشكلة كانت هنا (اتحلت)
  acceptReschedule(id: string): void {
    this.appointmentService.updateAppointmentStatus(id, 'confirmed').subscribe(() => {
      this.loadAppointments();
    });
  }

  cancelRescheduleProposal(id: string): void {
    this.appointmentService.deleteAppointment(id).subscribe(() => {
      this.loadAppointments();
    });
  }

  cancelApp(id: string): void {
    this.appointmentService.cancelAppointment(id).subscribe(() => {
      this.loadAppointments();
    });
  }

  go(): void {
    this.router.navigate(['/appointments']);
  }

  // ================= PASSWORD =================
  updatePassword(): void {
    if (this.passwordForm.invalid) return;

    this.passwordLoading = true;

    this.authService.updatePassword(
      this.passwordForm.get('currentPassword')!.value,
      this.passwordForm.get('newPassword')!.value
    ).then(() => {
      this.passwordSuccess = 'Password updated!';
      this.passwordForm.reset();
    }).catch((error: any) => {
      this.passwordError = error?.error?.message || 'Update failed';
    }).finally(() => {
      this.passwordLoading = false;
    });
  }

  // ================= UI =================
  closeStripeModal(): void {
    this.stripeModalOpen = false;
    this.currentPaymentAppointmentId = null;
    this.paymentElement?.unmount();
    this.elements = null;
  }
}