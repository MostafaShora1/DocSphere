import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit {
  loading = false;
  errorMsg = '';
  successMsg = '';
  token = '';

  resetPasswordForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  private readonly passwordMatchValidator = (form: any) => {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  };

  ngOnInit(): void {
    // ✅ إنشاء الفورم هنا بدل فوق
    this.resetPasswordForm = this.fb.nonNullable.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.resetPasswordForm.setValidators(this.passwordMatchValidator);

    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMsg = 'Invalid or missing reset token.';
      return;
    }

    // Verify token
    this.authService.verifyResetToken(this.token).then((valid: {valid: boolean; message?: string} | null) => {
      if (!valid?.valid) {
        this.errorMsg = valid?.message || 'Invalid or expired reset link.';
      }
    });
  }

  get passwordMismatch() {
    return this.resetPasswordForm.errors?.['mismatch'] &&
           this.resetPasswordForm.get('confirmPassword')?.touched;
  }

  async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      await this.authService.resetPassword(
        this.token,
        this.resetPasswordForm.getRawValue().password
      );

      this.successMsg = 'Password reset successful!';
      setTimeout(() => this.router.navigate(['/login']), 2000);

    } catch (error: any) {
      this.errorMsg = error?.error?.message || 'Failed to reset password.';
    } finally {
      this.loading = false;
    }
  }
}