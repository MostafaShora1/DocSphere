import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'app-theme';

  toggleTheme(): void {
    if (this.isDarkMode()) {
      this.setLightMode();
      return;
    }

    this.setDarkMode();
  }

  setDarkMode(): void {
    this.applyTheme('dark');
  }

  setLightMode(): void {
    this.applyTheme('light');
  }

  loadSavedTheme(): void {
    const savedTheme = this.getSavedTheme();
    this.applyTheme(savedTheme ?? 'light');
  }

  isDarkMode(): boolean {
    return this.document.body.classList.contains('dark-mode');
  }

  private getSavedTheme(): ThemeMode | null {
    const theme = localStorage.getItem(this.storageKey);
    return theme === 'dark' || theme === 'light' ? theme : null;
  }

  private applyTheme(theme: ThemeMode): void {
    const body = this.document.body;
    body.classList.remove('light-mode', 'dark-mode');
    body.classList.add(`${theme}-mode`);
    localStorage.setItem(this.storageKey, theme);
  }
}
