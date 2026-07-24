import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
