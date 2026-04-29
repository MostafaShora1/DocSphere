import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'ar' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly storageKey = 'app-language';
  private readonly defaultLanguage: AppLanguage = 'ar';

  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang).subscribe({
      next: () => {
        this.applyDocumentLanguage(lang);
        localStorage.setItem(this.storageKey, lang);
      },
      error: () => {
        this.applyDocumentLanguage(lang);
        localStorage.setItem(this.storageKey, lang);
      }
    });
  }

  getLanguage(): AppLanguage {
    const currentLanguage = this.translate.getCurrentLang();
    if (currentLanguage === 'ar' || currentLanguage === 'en') {
      return currentLanguage;
    }

    const savedLanguage = localStorage.getItem(this.storageKey);
    return savedLanguage === 'en' ? 'en' : this.defaultLanguage;
  }

  loadSavedLanguage(): void {
    this.translate.setFallbackLang(this.defaultLanguage);
    this.setLanguage(this.getLanguage());
  }

  private applyDocumentLanguage(lang: AppLanguage): void {
    const isArabic = lang === 'ar';
    this.document.documentElement.lang = lang;
    this.document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    this.document.body.classList.remove('rtl', 'ltr');
    this.document.body.classList.add(isArabic ? 'rtl' : 'ltr');
  }
}
