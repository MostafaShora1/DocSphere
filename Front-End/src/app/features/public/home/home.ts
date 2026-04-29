import { Component, OnInit, HostListener } from '@angular/core';
import { DataService } from '../../../core/services/data.service';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Doctor } from '../../../shared/models/doctor.model';
import { Service } from '../../../shared/models/service.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {

  doctors: Doctor[] = [];
  services: Service[] = [];

  selectedDoctor: Doctor | null = null;

  isScrolled = false;

  constructor(
    private dataService: DataService
  ) {}

  ngOnInit(): void {

    this.loadData();

  }

  loadData(): void {

    this.dataService
      .getDoctors()
      .subscribe({
        next: res => {
          this.doctors = res;
        },
        error: err => {
          console.error('Error loading doctors', err);
        }
      });

    this.dataService
      .getServices()
      .subscribe({
        next: res => {
          this.services = res;
        },
        error: err => {
          console.error('Error loading services', err);
        }
      });

  }

  openDoctor(doc: Doctor): void {

    this.selectedDoctor = doc;

  }

  closeModal(): void {

    this.selectedDoctor = null;

  }

  @HostListener('window:scroll')
  onScroll(): void {

    this.isScrolled =
      window.scrollY > 100;

  }

}