import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { Doctor } from '../../../shared/models/doctor.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  doctor?: Doctor;

  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    this.doctorService
      .getDoctorById(id || '')
      .subscribe(res => {
        this.doctor = res;

        if (!this.doctor) {
          alert('Doctor not found');
          this.router.navigate(['/doctors']);
        }
      });
  }

  bookAppointment() {
    if (!this.doctor) return;

    this.router.navigate(['/patient/appointments']);
  }

}
