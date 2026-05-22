import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  styleUrls: ['./login.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {

  // Password pattern
  private readonly passwordPattern =
    // /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    /^.{6,}$/;

  // Form
  loginForm!: FormGroup;

  // UI state
  showPassword: boolean = false;
  loading: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  // Initialize form safely
  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(this.passwordPattern)
        ]
      ]
    });

    this.route.queryParamMap.subscribe(params => {
      if (params.get('verified') === 'success') {
        this.successMsg = 'Email verified successfully. You can login now.';
      }
    });
  }

  // Toggle password visibility
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Submit form
  async onSubmit(): Promise<void> {

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMsg = this.translate.instant('AUTH.LOGIN.ERRORS.INVALID_FORM');
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {

      const { email, password } =
        this.loginForm.getRawValue();

      const user = await this.authService.login(
        email,
        password
      );

      if (!user) {
        this.errorMsg =
          'Invalid email or password';
        return;
      }

      // Navigate based on role
      if (user?.role === 'admin') {
        this.router.navigate(['/admin']);

      } else if (user?.role === 'doctor') {
        this.router.navigate(['/doctor']);

      } else {
        this.router.navigate(['/patient']);
      }

    } catch (error: any) {

      console.error('Login error:', error);

      if (error.status === 401) {
        this.errorMsg = this.translate.instant('AUTH.LOGIN.ERRORS.INVALID_CREDENTIALS');
      } else {
        this.errorMsg = error.error?.message || this.translate.instant('AUTH.LOGIN.ERRORS.FAILED');
      }

    } finally {

      this.loading = false;

    }
  }

}
