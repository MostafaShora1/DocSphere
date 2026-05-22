import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  FormGroup
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  styleUrls: ['./contact.css']
})
export class ContactComponent implements OnInit {

  submitted = false;
  isSubmitting = false;

  contactForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    this.contactForm =
      this.fb.group({

        firstName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[A-Za-z\sأ-ي]{2,50}$/)
          ]
        ],

        lastName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[A-Za-z\sأ-ي]{2,50}$/)
          ]
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        phone: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[0-9+]{10,15}$/)
          ]
        ],

        message: [
          '',
          [
            Validators.required,
            Validators.minLength(5)
          ]
        ]

      });

  }

  get f() {

    return this.contactForm.controls;

  }

  onSubmit() {

    this.submitted = true;

    if (this.contactForm.invalid)
      return;

    if (!this.authService.isLoggedIn()) {
      alert('You must be logged in to send a message. Please login first. ');
      return;
    }

    this.isSubmitting = true;

    this.apiService.submitContactMessage(this.contactForm.value).subscribe({
      next: (res) => {
        alert('Message sent successfully! The admin will review it soon. ');
        this.contactForm.reset();
        this.submitted = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Error submitting message:', err);
        const errorMsg = err.error?.message || 'Failed to send message. Please try again later.';
        alert(errorMsg );
        this.isSubmitting = false;
      }
    });

  }

}