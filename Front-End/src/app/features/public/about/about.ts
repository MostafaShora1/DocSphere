import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { TranslateModule } from '@ngx-translate/core';

declare var Swiper: any;

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class AboutComponent implements OnInit, AfterViewInit {
  doctors: any[] = [];
  admins: any[] = [];
  reviews: any[] = [];
  isLoading = false;
  isLoadingReviews = false;
  error: string | null = null;
  bgImage = 'assets/images/about-bg.png';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadReviews();
  }

  ngAfterViewInit(): void {
    if (typeof (window as any).AOS !== 'undefined') {
      (window as any).AOS.init({
        duration: 1000,
        once: true
      });
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.getDoctors().subscribe({
      next: res => {
        this.doctors = res || [];
      },
      error: err => {
        console.error('Error loading doctors', err);
        this.error = 'Failed to load doctors';
      }
    });

    this.apiService.getAdmins().subscribe({
      next: res => {
        this.admins = res || [];
        this.isLoading = false;
      },
      error: err => {
        console.error('Error loading admins', err);
        this.error = this.error || 'Failed to load admins';
        this.isLoading = false;
      }
    });
  }

  loadReviews(): void {
    this.isLoadingReviews = true;
    this.apiService.getReviews().subscribe({
      next: (res: any) => {
        this.reviews = res.data || res || [];
        this.isLoadingReviews = false;
        setTimeout(() => this.initSwiper(), 100);
      },
      error: (err) => {
        console.error('Error loading reviews', err);
        this.isLoadingReviews = false;
      }
    });
  }

  initSwiper(): void {
    if (typeof Swiper !== 'undefined') {
      const needsLoop = this.reviews.length >= 3;
      
      new Swiper('.about-reviews-swiper', {
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
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
      });
    }
  }
}
