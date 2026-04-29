import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandler implements ErrorHandler {
  private readonly document = inject(DOCUMENT);
  private readonly containerId = 'app-error-toast-container';
  private readonly toastClassName = 'app-error-toast';

  handleError(error: unknown): void {
    console.error('Global Error Handler:', error);
    this.showMessage(this.getRuntimeErrorMessage(error));
  }

  handleHttpError(error: HttpErrorResponse): void {
    console.error('HTTP Error:', error);
    const message = this.getHttpErrorMessage(error);
    if (!message) {
      return;
    }

    this.showMessage(message);
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string | null {
    const serverMessage = this.getServerMessage(error)?.toLowerCase() ?? '';
    const url = (error.url ?? '').toLowerCase();

    if (
      error.status === 404 &&
      (
        serverMessage.includes('patient profile not found') ||
        serverMessage.includes('doctor profile not found') ||
        url.includes('/appointments/patient') ||
        url.includes('/appointments/doctor')
      )
    ) {
      return null;
    }

    if (error.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }

    if (error.status === 400) {
      return this.getServerMessage(error) ?? 'The request could not be processed. Please review your input.';
    }

    if (error.status === 401) {
      return 'Your session is invalid or has expired. Please sign in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (error.status === 404) {
      return 'The requested resource was not found.';
    }

    if (error.status >= 500) {
      return 'Something went wrong on the server. Please try again in a moment.';
    }

    return this.getServerMessage(error) ?? 'Something went wrong. Please try again.';
  }

  private getRuntimeErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return this.getHttpErrorMessage(error) ?? 'Something went wrong. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  private getServerMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    if (typeof error.error?.error === 'string' && error.error.error.trim()) {
      return error.error.error;
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return null;
  }

  private showMessage(message: string): void {
    const container = this.getOrCreateContainer();
    const toast = this.document.createElement('div');

    toast.className = this.toastClassName;
    toast.textContent = message;

    Object.assign(toast.style, {
      background: '#c0392b',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '10px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
      fontSize: '14px',
      lineHeight: '1.4',
      maxWidth: '320px',
      pointerEvents: 'auto',
      opacity: '0',
      transform: 'translateY(-8px)',
      transition: 'opacity 180ms ease, transform 180ms ease'
    });

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';

      window.setTimeout(() => {
        toast.remove();
      }, 180);
    }, 4000);
  }

  private getOrCreateContainer(): HTMLElement {
    const existingContainer = this.document.getElementById(this.containerId);
    if (existingContainer) {
      return existingContainer;
    }

    const container = this.document.createElement('div');
    container.id = this.containerId;

    Object.assign(container.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: '9999',
      pointerEvents: 'none'
    });

    this.document.body.appendChild(container);
    return container;
  }
}
