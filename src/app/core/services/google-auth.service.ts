import { Injectable, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthStore } from '../auth.store';
import { I18nService } from '../i18n.service';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private authStore = inject(AuthStore);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  
  private googleClientId = '';
  private isScriptLoaded = false;
  private isInitializing = false;
  private loadedLang = '';

  constructor() {
    effect(() => {
      // Re-initialize or re-prompt when auth state or language changes
      this.i18n.lang();
      const isAuth = this.authStore.isAuthenticated();
      
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
        (window as any).google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: (window as any).handleGoogleCredential,
          cancel_on_tap_outside: false
        });
        
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

  private loadAndRenderButton(elementId: string) {
    this.loadGoogleScript().then(() => {
      if ((window as any).google && this.googleClientId) {
        (window as any).google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: (window as any).handleGoogleCredential
        });
        const container = document.getElementById(elementId);
        if (container) {
          container.innerHTML = '';
          const langCode = this.i18n.lang() === 'en' ? 'en' : 'zh-TW';
          (window as any).google.accounts.id.renderButton(
            container,
            { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', locale: langCode }
          );
        }
      }
    });
  }

  private handleGoogleCredential(response: any) {
    if (response && response.credential) {
      this.authStore.loginWithGoogle(response.credential).subscribe({
        next: () => {
          // Navigating away ensures we can clear up prompt state. 
          // If already on /account, maybe redirect to /account/listings
          const currentUrl = this.router.url;
          if (currentUrl === '/account') {
            this.router.navigate(['/account/listings']);
          } else {
            // Cancel prompt UI if it's still showing
            if ((window as any).google) {
              (window as any).google.accounts.id.cancel();
            }
          }
        },
        error: (err) => {
          console.error('Google login failed', err);
        }
      });
    }
  }
}
