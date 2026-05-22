import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../models/user.model';

import { ThemeService } from '../../../core/services/theme.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit, OnDestroy {
  isScrolled = false;
  menuOpen = false;
  currentUser: User | null = null;
  private authSubscription?: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    public translate: TranslateService
  ) {}

  toggleTheme() {
    this.themeService.toggleTheme();
    this.cdr.detectChanges();
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  switchLanguage() {
    const newLang = this.translate.currentLang === 'ar' ? 'en' : 'ar';
    this.translate.use(newLang);
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    this.cdr.detectChanges();
  }

  get currentLang(): string {
    return this.translate.currentLang || 'en';
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser() as User | null;
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user as User | null;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 100;
    this.cdr.detectChanges();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.cdr.detectChanges();
  }

  closeMenu() {
    this.menuOpen = false;
    this.cdr.detectChanges();
  }

  getDashboardRoute(): string {
    switch (this.currentUser?.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'patient':
        return '/patient/dashboard';
      default:
        return '/';
    }
  }

  navigateToDashboard() {
    this.closeMenu();
    this.router.navigate([this.getDashboardRoute()]);
  }

  logout() {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}
