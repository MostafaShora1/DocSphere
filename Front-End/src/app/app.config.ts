import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler, importProvidersFrom, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/error-handler';
import { authInterceptor } from './core/interceptors/auth-interceptor';

import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Version 18 compatible factory
import { Observable } from 'rxjs';

class CustomLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/assets/i18n/${lang}.json`);
  }
}

export function HttpLoaderFactory() {
  return new CustomLoader(inject(HttpClient));
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    importProvidersFrom(BrowserModule),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory
      },
      fallbackLang: 'en'
    })
  ]
};