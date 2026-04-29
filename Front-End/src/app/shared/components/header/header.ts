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

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
    private router: Router
  ) {}

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
