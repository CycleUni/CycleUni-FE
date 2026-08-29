import { Injectable, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthStore } from '../auth.store';
import { I18nService } from '../i18n.service';
import { ThemeService } from './theme.service';
import { RegionLinkService } from '../region-link.service';


@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private authStore = inject(AuthStore);
  private i18n = inject(I18nService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private regionLink = inject(RegionLinkService);
  private platformId = inject(PLATFORM_ID);
  
  private googleClientId = '';
  private isScriptLoaded = false;
  private isInitializing = false;
  private isGoogleInitialized = false;
  private loadedLang = '';

  constructor() {
    effect(() => {
      // Re-initialize or re-prompt when auth state or language changes
      this.i18n.lang();
      const isAuth = this.authStore.isAuthenticated();
      
      if (isAuth && isPlatformBrowser(this.platformId)) {
        // User just logged in (via Google or password) — mark session
        // so One Tap won't show again. Cancel any in-flight prompt.
        sessionStorage.setItem('google_one_tap_done', '1');
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.cancel();
        }
      }
      
      if (!isAuth && isPlatformBrowser(this.platformId)) {
        this.initializeGoogleAuth();
      }
    });
  }

  private loadGoogleScript(): Promise<void> {
    const currentLang = this.i18n.lang();
    if (this.isScriptLoaded && (window as any).google && this.loadedLang === currentLang) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-jssdk');
      if (existingScript) {
        existingScript.remove();
      }
      
      // We must remove google object to force a clean re-initialization if language changes
      delete (window as any).google;
      this.isGoogleInitialized = false;

      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = `https://accounts.google.com/gsi/client?hl=${this.i18n.lang()}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isScriptLoaded = true;
        this.loadedLang = currentLang;
        resolve();
      };
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  public initializeGoogleAuth() {
    if (!isPlatformBrowser(this.platformId) || this.isInitializing) return;
    
    // If user already completed a login this session, skip One Tap entirely
    if (sessionStorage.getItem('google_one_tap_done')) return;
    
    // If logged in, we shouldn't prompt One Tap
    if (this.authStore.isAuthenticated()) return;

    this.isInitializing = true;
    
    // Bind global handler
    (window as any).handleGoogleCredential = (response: any) => this.handleGoogleCredential(response);

    if (!this.googleClientId) {
      this.authStore.getAuthConfig().subscribe({
        next: (config) => {
          if (config && config.google_client_id) {
            this.googleClientId = config.google_client_id;
            this.setupGoogle();
          } else {
            this.isInitializing = false;
          }
        },
        error: (err) => {
          console.error('Failed to load Google Auth config', err);
          this.isInitializing = false;
        }
      });
    } else {
      this.setupGoogle();
    }
  }

  private setupGoogle() {
    this.loadGoogleScript().then(() => {
      if ((window as any).google && this.googleClientId) {
        if (!this.isGoogleInitialized) {
          (window as any).google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (window as any).handleGoogleCredential,
            cancel_on_tap_outside: false
          });
          this.isGoogleInitialized = true;
        }
        
        // Show One Tap prompt
        (window as any).google.accounts.id.prompt();
      }
      this.isInitializing = false;
    }).catch(err => {
      console.error('Failed to load Google SDK', err);
      this.isInitializing = false;
    });
  }

  public renderButton(elementId: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Bind global handler just in case
    (window as any).handleGoogleCredential = (response: any) => this.handleGoogleCredential(response);
    
    if (this.googleClientId) {
      this.loadAndRenderButton(elementId);
    } else {
      this.authStore.getAuthConfig().subscribe(config => {
        if (config?.google_client_id) {
          this.googleClientId = config.google_client_id;
          this.loadAndRenderButton(elementId);
        }
      });
    }
  }

  private get isDarkTheme(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    // resolved() already collapses 'system' to the OS preference, and does so
    // as a signal — the previous inline matchMedia read here was imperative,
    // so an OS appearance change while the page was open recoloured the site
    // but left the Google button rendered in the old variant.
    return this.themeService.resolved() === 'dark';
  }

  private loadAndRenderButton(elementId: string) {
    this.loadGoogleScript().then(() => {
      if ((window as any).google && this.googleClientId) {
        if (!this.isGoogleInitialized) {
          (window as any).google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (window as any).handleGoogleCredential
          });
          this.isGoogleInitialized = true;
        }
        const container = document.getElementById(elementId);
        if (container) {
          container.innerHTML = '';
          const langCode = this.i18n.lang() === 'en' ? 'en' : 'zh-TW';
          const btnTheme = this.isDarkTheme ? 'filled_black' : 'outline';
          
          let targetWidth = container.clientWidth || 280;
          targetWidth = Math.max(200, Math.min(targetWidth, 400));

          (window as any).google.accounts.id.renderButton(
            container,
            { theme: btnTheme, size: 'large', type: 'standard', text: 'continue_with', locale: langCode, width: targetWidth }
          );
        }
      }
    });
  }

  private handleGoogleCredential(response: any) {
    if (response && response.credential) {
      this.authStore.loginWithGoogle(response.credential).subscribe({
        next: () => {
          // Mark session so One Tap won't show again this session
          sessionStorage.setItem('google_one_tap_done', '1');
          // Cancel One Tap UI immediately
          if ((window as any).google?.accounts?.id) {
            (window as any).google.accounts.id.cancel();
          }
          // Navigating away ensures we can clear up prompt state. 
          // If already on /account, maybe redirect to /account/listings
          const currentUrl = this.router.url;
          if (currentUrl === '/account') {
            this.router.navigate(this.regionLink.path(['/account/listings']));
          }
        },
        error: (err) => {
          console.error('Google login failed', err);
        }
      });
    }
  }
}
