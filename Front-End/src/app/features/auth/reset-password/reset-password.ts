import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const resetPasswordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  private readonly passwordPattern = /^.{6,}$/;

  readonly resetPasswordForm;
  private token: string = '';

  tokenValid = false;
  verifying = false;

  errorMsg = '';
  successMsg = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(this.passwordPattern)
          ]
        ],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: resetPasswordMatchValidator }
    );

    // Default: disable until token is verified
    this.resetPasswordForm.disable();

    this.token =
      this.route.snapshot.paramMap.get('token') ||
      this.route.snapshot.queryParamMap.get('token') ||
      '';
  }

  async ngOnInit(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.token) {
      this.tokenValid = false;
      this.errorMsg = 'Reset token is required.';
      this.resetPasswordForm.disable();
      return;
    }

    this.verifying = true;
    try {
      const result = await this.authService.verifyResetToken(this.token);

      if (!result?.valid) {
        this.tokenValid = false;
        this.errorMsg = result?.message || 'Invalid or expired reset token.';
        this.resetPasswordForm.disable();
        return;
      }

      this.tokenValid = true;
      this.resetPasswordForm.enable();
    } catch {
      this.tokenValid = false;
      this.errorMsg = 'Invalid or expired reset token.';
      this.resetPasswordForm.disable();
    } finally {
      this.verifying = false;
    }
  }

  async resetPassword() {
    if (!this.tokenValid) {
      this.errorMsg = 'Invalid or expired reset token.';
      return;
    }

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      this.errorMsg = 'Please fix the highlighted fields.';
      this.successMsg = '';
      return;
    }

    const token = this.token;

    if (!token) {
      this.errorMsg = 'Reset token is required.';
      return;
    }

    this.errorMsg = '';
    this.successMsg = '';

    try {
      const { newPassword } = this.resetPasswordForm.getRawValue();
      await this.authService.resetPassword(token, newPassword!);

      this.successMsg = 'Password updated successfully.';

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    } catch (error: any) {
      this.errorMsg = error?.error?.message || 'Error resetting password.';
    }
  }
}
