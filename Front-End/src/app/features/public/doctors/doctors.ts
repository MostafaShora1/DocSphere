import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DoctorService } from '../../../core/services/doctor.service';
import { Doctor } from '../../../shared/models/doctor.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors.html',
  styleUrls: ['./doctors.css']
})
export class DoctorsComponent implements OnInit {

  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];

  searchText: string = '';
  selectedSpecialty: string = 'all';
  specialties: string[] = [];

  constructor(
    private doctorService: DoctorService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.doctorService
      .getDoctors()
      .subscribe(res => {

        this.doctors = res;

        this.filteredDoctors = res;

        this.loadSpecialties();

      });

  }

  loadSpecialties() {

    const specs =
      this.doctors.map(
        d => d.specialty
      );

    this.specialties =
      [...new Set(specs)];

  }

  trackByDoctor(index: number, doctor: Doctor): any {
    return doctor.id;
  }

  trackBySpecialty(index: number, specialty: string): string {
    return specialty;
  }

  applyFilter() {

    this.filteredDoctors =
      this.doctors.filter(d => {

        const nameOk =
          d.name
            .toLowerCase()
            .includes(
              this.searchText
                .toLowerCase()
            );

        const specOk =
          this.selectedSpecialty === 'all' ||
          d.specialty === this.selectedSpecialty;

        return nameOk && specOk;

      });

  }

  goToProfile(id: string) {

    this.router.navigate([
      '/doctor/profile',
      {
        id
      }
    ]);

  }

}
