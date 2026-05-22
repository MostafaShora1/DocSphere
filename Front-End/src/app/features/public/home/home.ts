import { Component, OnInit, HostListener, AfterViewChecked } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Doctor } from '../../../shared/models/doctor.model';
import { Service } from '../../../shared/models/service.model';

declare var Swal: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
  ],
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, AfterViewChecked {

  doctors: Doctor[] = [];
  services: Service[] = [];
  reviews: any[] = [];

  selectedDoctor: Doctor | null = null;

  isScrolled = false;
  isLoading = false;
  error: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    public translate: TranslateService
  ) { }

  // ================= Helpers =================

  getLocalizedName(doc: Doctor): string {
    const lang = this.translate.currentLang || 'ar';
    if (lang === 'ar') {
      return doc.fullNameAr || doc.name;
    }
    return doc.fullNameEn || doc.name;
  }

  // ================= Lifecycle =================

  ngOnInit(): void {
    this.loadData();
    this.initAOS();
  }

  ngAfterViewChecked(): void {
    if (this.reviews.length && !(window as any).homeSwiper) {
      this.initSwiper();
    }
  }

  // ================= Data =================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    // Doctors
    this.apiService.getDoctors().subscribe({
      next: doctors => {
        this.doctors = (Array.isArray(doctors) ? doctors : []).map((doctor: Doctor) => ({
          ...doctor,
          rating: (doctor as any).averageRating ?? doctor.rating ?? 0
        }));
      },
      error: err => {
        console.error('Error loading doctors', err);
        this.error = 'Failed to load doctors';
      }
    });

    // Services
    this.apiService.getServices().subscribe({
      next: services => {
        this.services = Array.isArray(services) ? services : [];
      },
      error: err => {
        console.error('Error loading services', err);
        this.error = this.error || 'Failed to load services';
      }
    });

    // Reviews
    this.apiService.getReviews().subscribe({
      next: (reviews: any[]) => {
        this.reviews = (Array.isArray(reviews) ? reviews : [])
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 6);

        this.isLoading = false;
      },
      error: err => {
        console.error('Error loading reviews', err);
        this.error = this.error || 'Failed to load reviews';
        this.isLoading = false;
      }
    });
  }

  // ================= Swiper =================

  private initSwiper(): void {
    const Swiper = (window as any).Swiper;
    if (!Swiper) {
      console.warn('Swiper not found');
      return;
    }

    if ((window as any).homeSwiper) {
      (window as any).homeSwiper.destroy(true, true);
    }

    const needsLoop = this.reviews.length >= 3;

    (window as any).homeSwiper = new Swiper('.reviews-swiper', {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: needsLoop,
      autoplay: needsLoop ? {
        delay: 5000,
        disableOnInteraction: false,
      } : false,
      navigation: {
        nextEl: '.swiper-button-next-custom',
        prevEl: '.swiper-button-prev-custom',
      },
      grabCursor: true,
    });
  }

  // ================= AOS =================

  private initAOS(): void {
    const AOS = (window as any).AOS;
    if (AOS) {
      AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }
  }

  // ================= UI =================

  openDoctor(doc: Doctor): void {
    this.selectedDoctor = doc;
  }

  closeModal(): void {
    this.selectedDoctor = null;
  }

  handleHeroClick(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/patient/appointments']);
    } else {
      this.router.navigate(['/services']);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 100;
  }

  bookService(serviceId: string): void {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      Swal.fire({
        title: this.translate.instant('SERVICES.BOOKING_ERROR_TITLE'),
        text: this.translate.instant('SERVICES.LOGIN_REQUIRED_MSG'),
        icon: 'warning',
        confirmButtonText: this.translate.instant('SERVICES.OK'),
        confirmButtonColor: '#145245'
      });
      this.router.navigate(['/login']);
      return;
    }

    if (user.role !== 'patient') {
      Swal.fire({
        title: this.translate.instant('SERVICES.BOOKING_ERROR_TITLE'),
        text: this.translate.instant('SERVICES.PATIENT_ONLY_MSG'),
        icon: 'error',
        confirmButtonText: this.translate.instant('SERVICES.OK'),
        confirmButtonColor: '#145245'
      });
      this.router.navigate(['/doctors']); 
      return;
    }

    this.router.navigate(['/patient/appointments'], {
      queryParams: { serviceId }
    });
  }
}