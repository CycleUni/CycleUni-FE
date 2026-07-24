import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private initialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    const gaId = environment.gaMeasurementId;
    if (!gaId || !isPlatformBrowser(this.platformId) || this.initialized) {
      return;
    }

    // Load Google Analytics script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() {
      // eslint-disable-next-line prefer-rest-params
      (window as any).dataLayer.push(arguments);
    };
    
    const gtag = (window as any).gtag;
    gtag('js', new Date());
    // Disable automatic page view so we can track SPA route changes manually
    gtag('config', gaId, { send_page_view: false });

    this.initialized = true;

    // Track route changes via Angular Router
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      gtag('config', gaId, {
        page_path: event.urlAfterRedirects
      });
    });
  }
}
