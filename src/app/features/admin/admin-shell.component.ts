import { RegionLinkDirective } from '../../core/region-link.directive';
import { Component, ElementRef, ViewChild, HostListener, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RegionLinkDirective, CommonModule, RouterModule, TPipe],
  template: `
    <div class="admin-layout">
      <!-- Desktop Sidebar / Mobile Drawer Menu -->
      <nav class="admin-sidebar" [class.drawer-open]="isDrawerOpen" [attr.aria-label]="'admin.ariaNav' | t" #sidebar (keydown)="onKeyDown($event)">
        <div class="sidebar-header">
          <h2>{{ 'admin.title' | t }}</h2>
          <button class="close-btn" (click)="closeDrawer()" [attr.aria-label]="'admin.ariaCloseDrawer' | t"><span aria-hidden="true">&times;</span></button>
        </div>
        <div class="sidebar-content">
          <ul class="nav-groups">
            <li class="nav-group">
              <div class="group-title">{{ 'admin.groupUsers' | t }}</div>
              <ul>
                <li><a regionLink="users" routerLinkActive="active">{{ 'admin.navUsers' | t }}</a></li>
                <li><a regionLink="managers" routerLinkActive="active">{{ 'admin.navManagers' | t }}</a></li>
              </ul>
            </li>
            <li class="nav-group">
              <div class="group-title">{{ 'admin.groupTransactions' | t }}</div>
              <ul>
                <li><a regionLink="listings" routerLinkActive="active">{{ 'admin.navListings' | t }}</a></li>
                <li><a regionLink="orders" routerLinkActive="active">{{ 'admin.navOrders' | t }}</a></li>
              </ul>
            </li>
            <li class="nav-group">
              <div class="group-title">{{ 'admin.groupModeration' | t }}</div>
              <ul>
                <li><a regionLink="reports" routerLinkActive="active">{{ 'admin.navReports' | t }}</a></li>
                <li><a regionLink="chat-reports" routerLinkActive="active">{{ 'admin.navChatReports' | t }}</a></li>
              </ul>
            </li>
            <li class="nav-group">
              <div class="group-title">{{ 'admin.groupSettings' | t }}</div>
              <ul>
                <li><a regionLink="schools" routerLinkActive="active">{{ 'admin.navSchools' | t }}</a></li>
                <li><a regionLink="categories" routerLinkActive="active">{{ 'admin.navCategories' | t }}</a></li>
              </ul>
            </li>
            <li class="nav-group">
              <div class="group-title">{{ 'admin.groupAds' | t }}</div>
              <ul>
                <li><a regionLink="advertisers" routerLinkActive="active">{{ 'admin.navAdvertisers' | t }}</a></li>
                <li><a regionLink="promotions" routerLinkActive="active">{{ 'admin.navAds' | t }}</a></li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Backdrop for mobile drawer -->
      <div class="drawer-backdrop" *ngIf="isDrawerOpen" (click)="closeDrawer()"></div>

      <!-- Main Content Area -->
      <div class="admin-main">
        <header class="mobile-header">
          <button class="menu-btn" (click)="openDrawer()" [attr.aria-expanded]="isDrawerOpen" aria-controls="admin-sidebar" #menuBtn>
            <span class="sr-only">{{ 'admin.toggleDrawer' | t }}</span>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <h1>{{ 'admin.title' | t }}</h1>
        </header>
        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      align-items: flex-start;
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px;
    }
    
    /* Sidebar (Desktop) */
    .admin-sidebar {
      width: 240px;
      flex-shrink: 0;
      padding-right: 24px;
      border-right: 1px solid var(--line);
      margin-right: 24px;
    }
    
    .mobile-header, .sidebar-header {
      display: none;
    }
    
    .nav-groups, .nav-group ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .nav-group {
      margin-bottom: 24px;
    }
    
    .group-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--ink);
      opacity: 0.7;
      margin-bottom: 8px;
      padding-left: 12px;
    }
    
    .nav-group a {
      display: block;
      padding: 8px 12px;
      border-radius: 6px;
      color: var(--ink);
      text-decoration: none;
      font-size: 14px;
    }
    
    .nav-group a:hover, .nav-group a.active {
      background: var(--paper-warm);
    }
    
    .nav-group a.active {
      color: var(--accent);
      font-weight: 600;
    }
    
    .admin-main {
      flex: 1;
      min-width: 0;
    }
    
    .admin-content {
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Mobile Drawer */
    @media (max-width: 768px) {
      .admin-layout {
        display: block;
        padding: 16px;
        /* Fix padding-bottom so content isn't covered by bottom tab bar (57px) */
        padding-bottom: calc(16px + 57px);
      }
      
      .mobile-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--line);
      }
      
      .mobile-header h1 {
        font-size: 20px;
        margin: 0;
      }
      
      .menu-btn {
        background: none;
        border: none;
        padding: 4px;
        color: var(--ink);
        cursor: pointer;
        display: flex;
      }
      
      .admin-sidebar {
        position: fixed;
        top: 0;
        left: -280px;
        width: 280px;
        height: 100vh;
        background: var(--paper, #fff);
        z-index: 1000; /* above bottom-tab-bar */
        transition: transform 0.3s ease;
        padding: 0;
        margin: 0;
        border-right: none;
        display: flex;
        flex-direction: column;
      }
      
      .admin-sidebar.drawer-open {
        transform: translateX(280px);
        box-shadow: 4px 0 16px rgba(0,0,0,0.1);
      }
      
      @media (prefers-reduced-motion: reduce) {
        .admin-sidebar {
          transition: none;
        }
      }
      
      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--line);
      }
      
      .sidebar-header h2 {
        font-size: 18px;
        margin: 0;
      }
      
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--ink);
        padding: 4px 8px;
      }
      
      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        /* Drawer content must account for 57px bottom tab bar */
        padding-bottom: calc(16px + 57px);
      }
      
      .drawer-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.4);
        z-index: 999;
      }
    }
  `]
})
export class AdminShellComponent {
  isDrawerOpen = false;
  isBrowser = false;
  
  @ViewChild('sidebar') sidebar!: ElementRef;
  @ViewChild('menuBtn') menuBtn!: ElementRef;

  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      if (this.isDrawerOpen) {
        this.closeDrawer();
      }
    });
  }

  openDrawer() {
    this.isDrawerOpen = true;
    if (this.isBrowser) {
      setTimeout(() => {
        const focusable = this.sidebar.nativeElement.querySelector('a, button');
        if (focusable) focusable.focus();
      }, 50);
    }
  }

  closeDrawer() {
    if (!this.isDrawerOpen) return;
    this.isDrawerOpen = false;
    if (this.isBrowser) {
      setTimeout(() => {
        if (this.menuBtn?.nativeElement) {
          this.menuBtn.nativeElement.focus();
        }
      }, 50);
    }
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.isDrawerOpen) {
      this.closeDrawer();
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.isDrawerOpen || event.key !== 'Tab') return;
    
    if (this.isBrowser && this.sidebar?.nativeElement) {
      const focusableEls = this.sidebar.nativeElement.querySelectorAll('a[href], button:not([disabled])');
      if (focusableEls.length === 0) return;
      
      const firstFocusableEl = focusableEls[0];
      const lastFocusableEl = focusableEls[focusableEls.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusableEl) {
          lastFocusableEl.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableEl) {
          firstFocusableEl.focus();
          event.preventDefault();
        }
      }
    }
  }
}
