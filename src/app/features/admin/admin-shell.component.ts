import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe],
  template: `
    <div class="admin-shell">
      <header class="admin-header">
        <h1>{{ 'admin.title' | t }}</h1>
        <nav class="admin-nav">
          <a routerLink="users" routerLinkActive="active">{{ 'admin.navUsers' | t }}</a>
          <a routerLink="schools" routerLinkActive="active">{{ 'admin.navSchools' | t }}</a>
          <a routerLink="categories" routerLinkActive="active">{{ 'admin.navCategories' | t }}</a>
          <a routerLink="listings" routerLinkActive="active">{{ 'admin.navListings' | t }}</a>
          <a routerLink="orders" routerLinkActive="active">{{ 'admin.navOrders' | t }}</a>
          <a routerLink="reports" routerLinkActive="active">{{ 'admin.navReports' | t }}</a>
          <a routerLink="chat-reports" routerLinkActive="active">{{ 'admin.navChatReports' | t }}</a>
          <a routerLink="managers" routerLinkActive="active">{{ 'admin.navManagers' | t }}</a>
          <a routerLink="advertisers" routerLinkActive="active">{{ 'admin.navAdvertisers' | t }}</a>
          <a routerLink="promotions" routerLinkActive="active">{{ 'admin.navAds' | t }}</a>
        </nav>
      </header>
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px;
    }
    .admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .admin-header h1 {
      font-size: 20px;
      margin: 0;
    }
    .admin-nav {
      display: flex;
      gap: 4px;
      /* On narrow screens this has 8 tabs and no wrap — without a scroll
         container of its own, the overflow is simply clipped (the flex item
         shrinks to the header's width) and the later tabs become completely
         unreachable, not just visually cramped. */
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .admin-nav a {
      padding: 8px 14px;
      border-radius: 4px;
      font-size: 14px;
      color: var(--ink);
      text-decoration: none;
      border: 1px solid transparent;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .admin-nav a:hover {
      background: var(--paper-warm);
    }
    .admin-nav a.active {
      border-color: var(--line);
      background: var(--paper-warm);
      color: var(--accent);
      font-weight: 600;
    }
    /* Every admin page renders a data table wider than a phone screen
       (email/name/school/status columns, etc). Rather than duplicate a
       scroll wrapper in each of the ~8 admin list/detail components, contain
       the overflow once here — .admin-content is a real DOM ancestor of
       whatever the router-outlet renders, so this clips/scrolls any child
       page's wide content regardless of Angular's view encapsulation. */
    .admin-content {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  `]
})
export class AdminShellComponent {}
