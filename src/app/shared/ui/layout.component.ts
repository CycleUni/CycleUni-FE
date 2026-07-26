import { Component, effect, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SwUpdate } from '@angular/service-worker';
import { UiDropdown } from './dropdown.component';
import { MetadataService } from '../../core/services/metadata.service';
import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';
import { SchoolStateService, MANUAL_SCHOOL_KEY } from '../../core/services/school-state.service';
import { MessageService } from '../../core/services/message.service';
import { I18nService, TPipe } from '../../core/i18n.service';
import { Lang } from '../../core/i18n';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ui-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiDropdown, TPipe],
  template: `
    <div class="layout-wrapper">
      <header class="app-header">
        <div class="header-content">
          <div class="brand-area">
            <h1 class="logo"><a routerLink="/">CycleUni 易校網</a></h1>
            <div class="school-selector">
              <ui-dropdown
                [options]="schools"
                [(ngModel)]="selectedSchool"
                (ngModelChange)="onSchoolChange($event)"
                [compact]="true"
                [appendToBody]="true"
                [customTrigger]="true"
              >
                <span dropdownTrigger class="school-trigger">
                  <svg class="school-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
                    <path d="M12 2v5"/>
                    <path d="M12 3.5 16 5.5 12 7.5"/>
                    <path d="M4 13 12 7 20 13"/>
                    <path d="M5 13v8h14v-8"/>
                    <path d="M10 21v-5h4v5"/>
                    <rect x="7.5" y="15.5" width="2" height="2"/>
                    <rect x="14.5" y="15.5" width="2" height="2"/>
                  </svg>
                  <span class="school-trigger-label">{{ selectedSchoolLabel }}</span>
                </span>
              </ui-dropdown>
            </div>
          </div>
          <div class="header-right">
            <nav class="nav-links">
              <a routerLink="/search" routerLinkActive="active-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5"/>
                  <line x1="20" y1="20" x2="15.4" y2="15.4"/>
                </svg>
                <span class="nav-label">{{ 'nav.search' | t }}</span>
              </a>
              <a routerLink="/sell" routerLinkActive="active-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span class="nav-label">{{ 'nav.sell' | t }}</span>
              </a>
              <a routerLink="/messages" class="nav-link-with-badge" routerLinkActive="active-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">
                  <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                </svg>
                <span class="nav-label">{{ 'nav.messages' | t }}</span>
                <span class="nav-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </a>
              <a routerLink="/account" routerLinkActive="active-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5"/>
                  <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
                </svg>
                <span class="nav-label">{{ userName || ('nav.account' | t) }}</span>
              </a>
              <a *ngIf="isStaff" routerLink="/admin" routerLinkActive="active-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="17" height="17" aria-hidden="true">
                  <path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4z"/>
                </svg>
                <span class="nav-label">{{ 'nav.admin' | t }}</span>
              </a>
            </nav>
            <ui-dropdown
              class="lang-dropdown"
              [options]="langOptions"
              [ngModel]="i18n.lang()"
              (ngModelChange)="onLangChange($event)"
              [searchable]="false"
              [customTrigger]="true"
              [iconOnly]="true"
              [compact]="true"
              [align]="'right'"
              [appendToBody]="true"
            >
              <span dropdownTrigger class="lang-icon-wrap">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <text x="1" y="15" font-family="inherit" font-size="13" font-weight="500" fill="var(--ink)">文</text>
                  <text x="11" y="19" font-family="inherit" font-size="10" font-weight="700" fill="var(--accent)">A</text>
                </svg>
              </span>
            </ui-dropdown>
          </div>
        </div>
      </header>

      <main class="main-content">
        <ng-content></ng-content>
      </main>

      <nav class="bottom-tab-bar">
        <a routerLink="/search" routerLinkActive="active-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5"/>
            <line x1="20" y1="20" x2="15.4" y2="15.4"/>
          </svg>
          <span class="tab-label">{{ 'nav.search' | t }}</span>
        </a>
        <a routerLink="/sell" routerLinkActive="active-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="2"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span class="tab-label">{{ 'nav.sell' | t }}</span>
        </a>
        <a routerLink="/messages" class="tab-with-badge" routerLinkActive="active-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
            <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
          </svg>
          <span class="tab-label">{{ 'nav.messages' | t }}</span>
          <span class="tab-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </a>
        <a routerLink="/account" routerLinkActive="active-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5"/>
            <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
          </svg>
          <span class="tab-label">{{ 'nav.account' | t }}</span>
        </a>
        <a *ngIf="isStaff" routerLink="/admin" routerLinkActive="active-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
            <path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4z"/>
          </svg>
          <span class="tab-label">{{ 'nav.admin' | t }}</span>
        </a>
      </nav>

      <footer class="app-footer">
        <div class="footer-content">
          <div class="footer-col">
            <h4>CycleUni</h4>
            <p>{{ 'footer.tagline' | t }}</p>
          </div>
          <div class="footer-col">
            <h4>{{ 'footer.about' | t }}</h4>
            <a href="javascript:void(0)">{{ 'footer.how' | t }}</a>
            <a href="javascript:void(0)">{{ 'footer.faq' | t }}</a>
          </div>
          <div class="footer-col">
            <h4>{{ 'footer.terms' | t }}</h4>
            <a href="javascript:void(0)">{{ 'footer.tos' | t }}</a>
            <a href="javascript:void(0)">{{ 'footer.privacy' | t }}</a>
          </div>
        </div>
        <div class="footer-bottom">
          {{ 'footer.copyright' | t }}
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .app-header {
      border-bottom: 1px solid var(--line);
      background-color: var(--paper);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-content {
      max-width: 1120px;
      margin: 0 auto;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-area {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .school-selector {
      width: 180px;
      margin-top: 12px; /* offsets ui-select's default margin-bottom */
    }
    .school-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0; /* let the label ellipsis instead of forcing the button to grow */
    }
    .school-icon {
      display: none;
      flex-shrink: 0;
    }
    .school-trigger-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .logo a {
      text-decoration: none;
      color: var(--ink);
      font-weight: 700;
      font-size: 20px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-links a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      box-sizing: border-box;
      min-height: 44px;
      min-width: 44px;
      color: var(--ink);
      text-decoration: none;
      font-weight: 500;
      border-radius: 8px;
    }
    .nav-links a:hover {
      color: var(--accent);
    }
    .nav-links a.active-link {
      color: var(--accent);
      font-weight: 700;
    }
    .nav-links svg {
      flex-shrink: 0;
    }
    .nav-link-with-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nav-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background-color: var(--accent);
      color: white;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }
    .lang-icon-wrap {
      display: inline-flex;
    }
    .main-content {
      flex: 1;
      width: 100%;
      overflow-x: hidden; /* Prevent horizontal overflow from content */
      box-sizing: border-box;
    }
    .bottom-tab-bar {
      display: none;
    }
    .app-footer {
      border-top: 1px solid var(--line);
      background-color: var(--paper-warm);
      padding: 48px 16px 24px;
      margin-top: 64px;
    }
    .footer-content {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      gap: 64px;
      margin-bottom: 48px;
    }
    .footer-col h4 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 16px;
    }
    .footer-col p {
      color: var(--muted);
      margin: 0;
      font-size: 14px;
      max-width: 240px;
      line-height: 1.6;
    }
    .footer-col a {
      display: block;
      color: var(--muted);
      text-decoration: none;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .footer-col a:hover {
      color: var(--accent);
    }
    .footer-bottom {
      max-width: 1120px;
      margin: 0 auto;
      border-top: 1px solid var(--line);
      padding-top: 24px;
      color: var(--muted);
      font-size: 14px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .header-content {
        padding: 12px 16px;
      }
      .brand-area {
        justify-content: space-between;
        gap: 12px;
      }
      .school-selector {
        /* Shrinks to its content (icon + caret) instead of a fixed field width,
           so it can never wrap onto a second row with the language switcher. */
        width: auto;
        margin-top: 0;
      }
      .school-icon {
        display: inline-flex;
      }
      .school-trigger-label {
        /* Kept in the DOM (not display:none) so the button's accessible name
           still reads the selected school name to screen readers; visually
           hidden since the icon carries the affordance on narrow screens. */
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
      /* Primary nav moves to the bottom tab bar on mobile; only the language
         switcher stays in the header. */
      .header-right .nav-links {
        display: none;
      }
      .main-content {
        /* Reserve space so page content doesn't end up under the fixed tab bar */
        padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
      }
      .bottom-tab-bar {
        display: flex;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
        border-top: 1px solid var(--line);
        background-color: var(--paper);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .bottom-tab-bar a {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 56px;
        color: var(--muted);
        text-decoration: none;
        position: relative;
      }
      .bottom-tab-bar a.active-tab {
        color: var(--accent);
      }
      .bottom-tab-bar .tab-label {
        font-size: 11px;
        font-weight: 500;
      }
      .bottom-tab-bar .tab-with-badge {
        position: relative;
      }
      .bottom-tab-bar .tab-badge {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(6px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background-color: var(--accent);
        color: white;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
      }
      .footer-content {
        flex-direction: column;
        gap: 32px;
        margin-bottom: 32px;
      }
      .app-footer {
        padding: 32px 16px 24px;
        margin-top: 48px;
      }
    }

    @media (max-width: 480px) {
      .header-content {
        padding: 10px 12px;
      }
      .brand-area {
        gap: 8px;
        flex-wrap: wrap;
      }
      .logo a {
        font-size: 18px;
      }
      .header-right {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  `]
})
export class UiLayout implements OnDestroy {
  selectedSchool = '';
  schools: { value: string, label: string }[] = [];
  unreadCount = 0;
  readonly langOptions = [
    { value: 'zh-TW', label: '中文 (繁體)' },
    { value: 'en', label: 'English' }
  ];

  private metadataService = inject(MetadataService);
  private authStore = inject(AuthStore);
  private accountService = inject(AccountService);
  private schoolStateService = inject(SchoolStateService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private swUpdate = inject(SwUpdate);
  readonly i18n = inject(I18nService);

  private unreadCountSubscription: Subscription;
  private swUpdateSubscription?: Subscription;
  private hubConnectedForUserId: string | null = null;

  get selectedSchoolLabel(): string {
    const found = this.schools.find(s => s.value === this.selectedSchool);
    return found?.label || this.i18n.t('layout.allSchools') || '全部大學';
  }

  get userName(): string {
    if (!this.authStore.isAuthenticated()) return '';
    const profile = this.accountService.profileCache();
    if (!profile) return '';
    return profile.display_name || profile.email || '';
  }

  get isStaff(): boolean {
    if (!this.authStore.isAuthenticated()) return false;
    return this.accountService.profileCache()?.is_staff === true;
  }

  constructor() {
    // Runs on init and again whenever the language changes, so school labels
    // are re-fetched in the newly selected language
    effect(() => {
      this.i18n.lang();
      this.loadMetadata();
    });

    // The single per-user notification connection lives here (the persistent
    // app shell, never destroyed by route navigation) rather than in the
    // Messages page component, so it survives switching to any other page —
    // "logged in" is the only thing that should start/stop it, not which
    // route is active. Re-runs whenever isAuthenticated changes (login/logout
    // in this tab, or in another tab via AuthStore's storage-event sync).
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.accountService.getMyProfile().subscribe({ error: () => {} });
        this.connectHub();
      } else {
        this.hubConnectedForUserId = null;
        this.messageService.disconnectHub();
        // Clear manual school selection on logout - next session uses bound school
        this.schoolStateService.clearManualSchool();
      }
    });

    this.unreadCountSubscription = this.messageService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      this.cdr.markForCheck();
    });

    // Without this, a tab left open across a deploy keeps running the old
    // build indefinitely — and since each build's JS/CSS chunk filenames are
    // content-hashed, the stale service worker's asset manifest ends up
    // referencing files the CDN no longer serves, surfacing as fetch
    // failures (e.g. net::ERR_CACHE_MISS / net::ERR_FAILED) instead of just
    // an outdated UI. Reload as soon as a new version has finished
    // installing so the app is always running what was actually deployed.
    if (this.swUpdate.isEnabled) {
      this.swUpdateSubscription = this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.swUpdate.activateUpdate().then(() => document.location.reload());
        }
      });
    }
  }

  ngOnDestroy() {
    this.unreadCountSubscription.unsubscribe();
    this.swUpdateSubscription?.unsubscribe();
  }

  private connectHub() {
    this.messageService.getHubToken().subscribe({
      next: (res) => {
        let uid = '';
        try {
          uid = JSON.parse(atob(res.token.split('.')[1])).user_id;
        } catch (e) { }
        if (!uid || uid === this.hubConnectedForUserId) return;
        this.hubConnectedForUserId = uid;
        this.messageService.connectHub(res.token, uid, res.edge_chat_url);
      }
    });
  }

  switchLang(lang: Lang) {
    this.i18n.setLang(lang);
  }

  onLangChange(lang: string) {
    this.switchLang(lang as Lang);
  }

  private loadMetadata() {
    this.metadataService.getMetadata().subscribe({
      next: (data) => {
        if (data.schools && data.schools.length > 0) {
          this.schools = [
            { value: '', label: this.i18n.t('layout.allSchools') || '全部大學' },
            ...data.schools.map((s: any) => ({
              value: s.name,
              label: s.display_name || s.name
            }))
          ];

          // Keep the user's current selection across language switches
          const current = this.schoolStateService.currentSchool;
          if (this.schoolStateService.hasInitialized) {
            if (this.schools.some(s => s.value === current)) {
              this.selectedSchool = current;
              this.cdr.markForCheck();
            }
            return;
          }

          this.schoolStateService.hasInitialized = true;

          // Check for manual school selection from sessionStorage (single-session memory)
          const manualSchool = this.schoolStateService.getManualSchool();
          if (manualSchool && this.schools.some(s => s.value === manualSchool)) {
            this.selectedSchool = manualSchool;
            this.schoolStateService.setSchool(this.selectedSchool);
            this.cdr.markForCheck();
            return;
          }

          // Default to "All Schools"
          this.selectedSchool = '';
          this.schoolStateService.setSchool(this.selectedSchool);
          this.cdr.markForCheck();

          if (this.authStore.isLoggedIn()) {
            this.accountService.getMyProfile().subscribe({
              next: (profile) => {
                if (profile.school) {
                  const userSchool = data.schools.find((s: any) => s.id === profile.school);
                  if (userSchool) {
                    this.selectedSchool = userSchool.name;
                    this.schoolStateService.setSchool(this.selectedSchool);
                    this.cdr.markForCheck();
                  }
                }
              },
              error: () => { }
            });
          }
        }
      }
    });
  }

  onSchoolChange(school: string) {
    // User manually changed school - save to sessionStorage for this session
    if (school !== this.schoolStateService.currentSchool) {
      this.schoolStateService.setManualSchool(school);
    }
  }
}
