import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  FormGroup
} from '@angular/forms';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  styleUrls: ['./contact.css']
})
export class ContactComponent implements OnInit {

  submitted = false;

  contactForm!: FormGroup;

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {

    this.contactForm =
      this.fb.group({

        name: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-z\s]{3,50}$/)
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
            Validators.pattern(/^\d{10,15}$/)
          ]
        ],

        message: [
          '',
          [
            Validators.required,
            Validators.minLength(10)
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

    alert('Message sent successfully ✅');

    this.contactForm.reset();

    this.submitted = false;

  }

}