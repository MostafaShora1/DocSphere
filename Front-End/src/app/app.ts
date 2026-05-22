import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';

import { ThemeService } from './core/services/theme.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ReactiveFormsModule,
    Header,
    Footer,
    TranslateModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('DocSphere');

  constructor(
    private themeService: ThemeService,
    private translate: TranslateService
  ) {
    this.themeService.loadSavedTheme();

    // Setup translation
    this.translate.addLangs(['en', 'ar']);
    this.translate.setDefaultLang('en');

    const savedLang = localStorage.getItem('lang') || 'en';
    this.translate.use(savedLang);
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }
}