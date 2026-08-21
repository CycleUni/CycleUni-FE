import { Component, inject, effect, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { I18nService, TPipe } from './core/i18n.service';
import { UiLayout } from './shared/ui/layout.component';
import { NavigationHistoryService } from './core/services/navigation-history.service';
import { GoogleAuthService } from './core/services/google-auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

/** App shell: the persistent layout (header/footer) wraps the router outlet,
 * so route changes swap only the page content instead of re-rendering the
 * whole chrome. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiLayout, TPipe],
  template: `
    <ui-layout>
      <router-outlet />
    </ui-layout>
    @if (updateReady()) {
      <div class="update-prompt">
        <span>{{ 'app.updateAvailable' | t }}</span>
        <button (click)="reloadPage()">{{ 'app.updateReload' | t }}</button>
      </div>
    }
  `,
  styles: [`
    .update-prompt {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--paper);
      border: 1px solid var(--line-strong);
      box-shadow: var(--shadow-card-lg);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-control);
      display: flex;
      align-items: center;
      gap: var(--space-4);
      z-index: 9999;
      font-size: var(--text-base);
    }
    .update-prompt button {
      background: var(--btn-primary-bg);
      color: var(--btn-primary-ink);
      border: none;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-control);
      cursor: pointer;
      font-weight: 500;
    }
    .update-prompt button:hover {
      background: var(--btn-primary-bg-hover);
    }
  `]
})
export class App {
  private navHistory = inject(NavigationHistoryService);
  private googleAuth = inject(GoogleAuthService); // Initializes One Tap globally
  private googleAnalytics = inject(GoogleAnalyticsService); // Initializes GA globally
  private i18n = inject(I18nService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private swUpdate = inject(SwUpdate);

  private router = inject(Router);

  updateReady = signal(false);

  constructor() {
    effect(() => {
      // Accessing i18n.lang() registers it as a dependency for this effect
      const lang = this.i18n.lang();
      
      const title = this.i18n.t('seo.title');
      const description = this.i18n.t('seo.description');
      
      if (title) {
        this.titleService.setTitle(title);
      }
      if (description) {
        this.metaService.updateTag({ name: 'description', content: description });
      }
    });

    // Without this, a tab left open across a deploy keeps running the old
    // build indefinitely — and since each build's JS/CSS chunk filenames are
    // content-hashed, the stale service worker's asset manifest ends up
    // referencing files the CDN no longer serves, surfacing as fetch
    // failures (e.g. net::ERR_CACHE_MISS / net::ERR_FAILED) instead of just
    // an outdated UI. 
    // 
    // To solve this without disrupting the user's current task (e.g., filling a form),
    // we immediately call activateUpdate() so the service worker serves the new assets 
    // for subsequent requests, and then show a prompt. We also automatically reload 
    // the page on the next route change when state loss is no longer a concern.
    if (this.swUpdate.isEnabled) {
      let updateActivated = false;

      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          takeUntilDestroyed()
        )
        .subscribe(() => {
          this.swUpdate.activateUpdate().then(() => {
            updateActivated = true;
            this.updateReady.set(true);
          });
        });

      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          filter(() => updateActivated),
          takeUntilDestroyed()
        )
        .subscribe(() => {
          document.location.reload();
        });
    }
  }

  reloadPage() {
    location.reload();
  }
}
