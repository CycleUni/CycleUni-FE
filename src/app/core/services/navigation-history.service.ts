import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private router = inject(Router);
  private location = inject(Location);
  private platformId = inject(PLATFORM_ID);

  private historyStack: string[] = [];
  private isBackNav = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Seed initial URL if router already has a active route URL upon service instantiation
      if (this.router.url) {
        this.historyStack.push(this.router.url);
      }

      window.addEventListener('popstate', () => {
        this.isBackNav = true;
      });
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.isBackNav) {
          if (this.historyStack.length > 0) {
            this.historyStack.pop();
          }
          this.isBackNav = false;
        } else {
          // Avoid duplicate entry if the constructor already seeded the initial URL
          if (this.historyStack.length === 1 && this.historyStack[0] === e.urlAfterRedirects) {
            return;
          }
          this.historyStack.push(e.urlAfterRedirects);
        }
      });
  }

  get canGoBack(): boolean {
    return this.historyStack.length > 1;
  }

  goBack() {
    if (this.canGoBack) {
      this.isBackNav = true;
      this.location.back();
    }
  }
}
