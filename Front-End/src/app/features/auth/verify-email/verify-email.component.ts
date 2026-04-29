import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailComponent {
  readonly verifyEmailForm;

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.verifyEmailForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[A-Za-z0-9]{4,8}$/)]]
    });

    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.verifyEmailForm.patchValue({ email });
    }

    if (this.route.snapshot.queryParamMap.get('registered') === 'success') {
      this.successMsg = 'Account created successfully. Check your email for the verification code.';
    }
  }

  async onSubmit(): Promise<void> {
    if (this.verifyEmailForm.invalid) {
      this.verifyEmailForm.markAllAsTouched();
      this.errorMsg = 'Please enter a valid email and verification code.';
      this.successMsg = '';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const { email, code } = this.verifyEmailForm.getRawValue();
      await this.authService.verifyEmail(email, code);

      this.successMsg = 'Email verified successfully.';

      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { verified: 'success' }
        });
      }, 1500);
    } catch (error: any) {
      this.errorMsg = error?.error?.message || 'Failed to verify email.';
    } finally {
      this.loading = false;
    }
  }
}
