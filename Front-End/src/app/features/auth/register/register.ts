import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

interface SpecialtyOption {
  id: string;
  name: string;
}

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  readonly registerForm;
  specialties: SpecialtyOption[] = [];
  readonly maxBirthDate = new Date().toISOString().split('T')[0];

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        role: ['patient', [Validators.required]],
        birthDate: [''],
        phone: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(this.passwordPattern)
          ]
        ],
        confirmPassword: ['', [Validators.required]],
        specialty: [''],
        consultationFee: [''],
        experience: [''],
        bio: [''],
        qualifications: [''],
        languages: [''],
        clinicStreet: [''],
        clinicCity: [''],
        clinicState: [''],
        clinicZipCode: [''],
        clinicCountry: [''],
        profilePicture: ['']
      },
      { validators: passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.applyRoleValidators(this.selectedRole);
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      this.applyRoleValidators(role || 'patient');
    });

    this.apiService.getSpecialties().subscribe({
      next: specialties => {
        this.specialties = specialties;
      }
    });
  }

  get selectedRole(): string {
    return this.registerForm.get('role')?.value || 'patient';
  }

  get isDoctor(): boolean {
    return this.selectedRole === 'doctor';
  }

  get isPatient(): boolean {
    return this.selectedRole === 'patient';
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMsg = 'Please fix the highlighted fields.';
      this.successMsg = '';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const formValue = this.registerForm.getRawValue();
      const {
        name,
        email,
        password,
        phone,
        role,
        birthDate,
        specialty,
        consultationFee,
        experience,
        bio,
        qualifications,
        languages,
        clinicStreet,
        clinicCity,
        clinicState,
        clinicZipCode,
        clinicCountry,
        profilePicture
      } = formValue;

      await this.authService.register(
        name!,
        email!,
        password!,
        phone!,
        role!,
        birthDate || ''
      );

      if (role === 'patient') {
        const { firstName, lastName } = this.splitName(name!);
        this.authService.storePendingProfileDraft(email!, {
          role: 'patient',
          patientProfile: {
            firstName,
            lastName,
            phone: phone!,
            dateOfBirth: birthDate || null
          }
        });
      }

      if (role === 'doctor') {
        this.authService.storePendingProfileDraft(email!, {
          role: 'doctor',
          doctorProfile: {
            fullName: name!,
            specialty: specialty!,
            bio: bio || '',
            experience: Number(experience || 0),
            qualifications: this.toList(qualifications || ''),
            languages: this.toList(languages || ''),
            consultationFee: Number(consultationFee || 0),
            clinicAddress: {
              street: clinicStreet || '',
              city: clinicCity || '',
              state: clinicState || '',
              zipCode: clinicZipCode || '',
              country: clinicCountry || ''
            },
            profilePicture: profilePicture || ''
          }
        });
      }

      this.successMsg = 'Account created successfully. Please verify your email.';
      this.router.navigate(['/verify-email'], {
        queryParams: { email, registered: 'success' }
      });
    } catch (error: any) {
      this.errorMsg = error.error?.message || 'Registration failed';
    } finally {
      this.loading = false;
    }
  }

  private applyRoleValidators(role: string): void {
    const birthDateControl = this.registerForm.get('birthDate');
    const specialtyControl = this.registerForm.get('specialty');
    const consultationFeeControl = this.registerForm.get('consultationFee');

    if (role === 'patient') {
      birthDateControl?.setValidators([Validators.required]);
      specialtyControl?.clearValidators();
      consultationFeeControl?.clearValidators();
    } else {
      birthDateControl?.clearValidators();
      specialtyControl?.setValidators([Validators.required]);
      consultationFeeControl?.setValidators([Validators.required, Validators.min(0)]);
    }

    birthDateControl?.updateValueAndValidity({ emitEvent: false });
    specialtyControl?.updateValueAndValidity({ emitEvent: false });
    consultationFeeControl?.updateValueAndValidity({ emitEvent: false });
  }

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 1) {
      return {
        firstName: parts[0] || fullName,
        lastName: parts[0] || fullName
      };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  private toList(value: string): string[] {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
}
