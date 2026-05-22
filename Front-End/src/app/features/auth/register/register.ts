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
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
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
  

  // ✅ NEW (الصورة)
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  uploadedImageUrl: string = '';

  selectedCertificate: File | null = null;
  certificatePreview: string | null = null;
  isPdf = false;
  uploadedCertificateUrl: string = '';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        nameAr: [''],
        nameEn: [''],
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

  // ✅ NEW (اختيار الصورة + preview)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onCertificateSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedCertificate = file;
      this.isPdf = file.type === 'application/pdf';

      if (!this.isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          this.certificatePreview = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.certificatePreview = 'pdf'; // Just to show the placeholder
      }
    }
  }

  // ✅ UPDATED (رفع أي ملف على Cloudinary)
  async uploadToCloudinary(file: File): Promise<string> {
    if (!file) return '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'doctor_preset');

    try {
      const res = await fetch(
        'https://api.cloudinary.com/v1_1/djyd5feom/image/upload',
        {
          method: 'POST',
          body: formData
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Cloudinary Upload Error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
      }

      const data = await res.json();
      console.log('Cloudinary Upload Success:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary Fetch Error:', error);
      throw error;
    }
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMsg = this.translate.instant('AUTH.REGISTER.ERR_FIELDS');
      this.successMsg = '';
      
      // For debugging
      const invalidControls: string[] = [];
      const controls = this.registerForm.controls;
      Object.keys(controls).forEach(key => {
        const control = this.registerForm.get(key);
        if (control?.invalid) {
          invalidControls.push(key);
        }
      });
      console.log('Invalid Controls:', invalidControls);
      if (this.registerForm.errors) console.log('Form Errors:', this.registerForm.errors);

      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const formValue = this.registerForm.getRawValue();
      const {
        name,
        nameAr,
        nameEn,
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

      // ✅ NEW (رفع الملفات لو دكتور)
      let imageUrl = '';
      let certUrl = '';
      if (role === 'doctor') {
        if (this.selectedFile) {
          imageUrl = await this.uploadToCloudinary(this.selectedFile);
        }
        if (this.selectedCertificate) {
          certUrl = await this.uploadToCloudinary(this.selectedCertificate);
        }
      }

      const finalName = role === 'doctor' ? (nameEn || nameAr || name!) : name!;
      await this.authService.register(
        finalName,
        email!,
        password!,
        phone!,
        role!,
        birthDate || '',
        nameAr || '',
        nameEn || ''
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
            fullName: nameEn || name!, // Fallback
            fullNameAr: nameAr || '',
            fullNameEn: nameEn || '',
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
            profilePicture: imageUrl || '',
            certificate: certUrl || ''
          }
        });
      }

      this.successMsg = this.translate.instant('AUTH.REGISTER.SUCCESS');
      this.router.navigate(['/verify-email'], {
        queryParams: { email, registered: 'success' }
      });
    } catch (error: any) {
      this.errorMsg = error.error?.message || this.translate.instant('AUTH.REGISTER.ERR_FAILED');
    } finally {
      this.loading = false;
    }
  }

  private applyRoleValidators(role: string): void {
    const nameControl = this.registerForm.get('name');
    const birthDateControl = this.registerForm.get('birthDate');
    const specialtyControl = this.registerForm.get('specialty');
    const consultationFeeControl = this.registerForm.get('consultationFee');

    if (role === 'patient') {
      nameControl?.setValidators([Validators.required, Validators.minLength(3)]);
      birthDateControl?.setValidators([Validators.required]);
      this.registerForm.get('nameAr')?.clearValidators();
      this.registerForm.get('nameEn')?.clearValidators();
      specialtyControl?.clearValidators();
      consultationFeeControl?.clearValidators();
    } else {
      nameControl?.clearValidators();
      birthDateControl?.clearValidators();
      this.registerForm.get('nameAr')?.setValidators([Validators.required, Validators.minLength(3)]);
      this.registerForm.get('nameEn')?.setValidators([Validators.required, Validators.minLength(3)]);
      specialtyControl?.setValidators([Validators.required]);
      consultationFeeControl?.setValidators([Validators.required, Validators.min(0)]);
    }

    nameControl?.updateValueAndValidity({ emitEvent: false });

    this.registerForm.get('nameAr')?.updateValueAndValidity({ emitEvent: false });
    this.registerForm.get('nameEn')?.updateValueAndValidity({ emitEvent: false });

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