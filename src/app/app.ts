import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { I18nService } from './core/i18n.service';
import { UiLayout } from './shared/ui/layout.component';
import { NavigationHistoryService } from './core/services/navigation-history.service';
import { GoogleAuthService } from './core/services/google-auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';

/** App shell: the persistent layout (header/footer) wraps the router outlet,
 * so route changes swap only the page content instead of re-rendering the
 * whole chrome. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiLayout],
  template: `
    <ui-layout>
      <router-outlet />
    </ui-layout>
  `,
})
export class App {
  private navHistory = inject(NavigationHistoryService);
  private googleAuth = inject(GoogleAuthService); // Initializes One Tap globally
  private googleAnalytics = inject(GoogleAnalyticsService); // Initializes GA globally
  private i18n = inject(I18nService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

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
  }
}
