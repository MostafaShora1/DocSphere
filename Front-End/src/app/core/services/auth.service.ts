import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AuthUser {
  id: string;
  role: string;
  email: string;
  name: string;
}

interface PendingProfileDraft {
  role: 'patient' | 'doctor';
  patientProfile?: {
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth?: string | null;
  };
  doctorProfile?: {
    fullName: string;
    specialty: string;
    bio?: string;
    experience?: number;
    qualifications?: string[];
    languages?: string[];
    consultationFee: number;
    clinicAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    profilePicture?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'authToken';
  private readonly currentUserKey = 'currentUser';
  private readonly pendingDraftKey = 'pendingProfileDrafts';
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(
    this.readStoredUser()
  );
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async login(email: string, password: string): Promise<AuthUser | null> {
    const response: any = await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/login`, { email, password })
    );

    // Backend returns 'token', frontend was looking for 'accessToken'
    const token = response.token || response.accessToken || response;

    if (!token || typeof token !== 'string') {
      console.error('Invalid login response:', response);
      return null;
    }

    localStorage.setItem(this.tokenKey, token);

    const meResponse: any = await firstValueFrom(
      this.http.get(`${this.baseUrl}/auth/me`)
    );

    const user = meResponse?.user;
    const payload = this.decodeToken(token);
    const normalizedUser: AuthUser = {
      id: user?._id || user?.id || payload.id,
      role: user?.role || payload.role || 'patient',
      email: user?.email || email,
      name: user?.name || email
    };

    this.setCurrentUser(normalizedUser);
    await this.completePendingProfileSetup(normalizedUser);

    return normalizedUser;
  }

  async register(
    name: string,
    email: string,
    password: string,
    phone: string,
    role: string,
    birthDate: string
  ) {
    try {
      return await firstValueFrom(
        this.http.post(`${this.baseUrl}/auth/register`, {
          name,
          email,
          password,
          phonePrimary: phone,
          role,
          birthDate
        })
      );
    } catch (error) {
      console.error('Auth register error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    return await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/forgot-password`, { email })
    );
  }

  async resetPassword(token: string, newPassword: string) {
    return await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/reset-password/${token}`, {
        password: newPassword
      })
    );
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; message?: string } | null> {
    try {
      return await firstValueFrom(
        this.http.get<{ valid: boolean; message?: string }>(
          `${this.baseUrl}/auth/verify-reset-token/${token}`
        )
      );
    } catch {
      return null;
    }
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return await firstValueFrom(
      this.http.put(`${this.baseUrl}/auth/update-password`, {
        currentPassword,
        newPassword
      })
    );
  }

  async verifyEmail(email: string, otp: string) {
    return await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/verify-email`, {
        email,
        verificationCode: otp
      })
    );
  }

  storePendingProfileDraft(email: string, draft: PendingProfileDraft): void {
    const drafts = this.readPendingDrafts();
    drafts[email.toLowerCase()] = draft;
    localStorage.setItem(this.pendingDraftKey, JSON.stringify(drafts));
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.currentUserKey);
    this.currentUserSubject.next(null);
  }

  private async completePendingProfileSetup(user: AuthUser): Promise<void> {
    const drafts = this.readPendingDrafts();
    const draft = drafts[user.email.toLowerCase()];

    if (!draft || draft.role !== user.role) {
      return;
    }

    try {
      if (draft.role === 'patient' && draft.patientProfile) {
        await firstValueFrom(
          this.http.post(`${this.baseUrl}/patients`, draft.patientProfile)
        );
      }

      if (draft.role === 'doctor' && draft.doctorProfile) {
        await firstValueFrom(
          this.http.post(`${this.baseUrl}/doctors`, draft.doctorProfile)
        );
      }

      delete drafts[user.email.toLowerCase()];
      localStorage.setItem(this.pendingDraftKey, JSON.stringify(drafts));
    } catch (error: any) {
      const message = `${error?.error?.message || ''}`.toLowerCase();
      if (
        error?.status === 400 &&
        (message.includes('already exists') || message.includes('already'))
      ) {
        delete drafts[user.email.toLowerCase()];
        localStorage.setItem(this.pendingDraftKey, JSON.stringify(drafts));
      } else {
        console.warn('Profile bootstrap skipped:', error);
      }
    }
  }

  private setCurrentUser(user: AuthUser): void {
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private readStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(this.currentUserKey);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(this.currentUserKey);
      return null;
    }
  }

  private readPendingDrafts(): Record<string, PendingProfileDraft> {
    const storedDrafts = localStorage.getItem(this.pendingDraftKey);
    if (!storedDrafts) {
      return {};
    }

    try {
      return JSON.parse(storedDrafts) as Record<string, PendingProfileDraft>;
    } catch {
      localStorage.removeItem(this.pendingDraftKey);
      return {};
    }
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return {};
    }
  }
}
