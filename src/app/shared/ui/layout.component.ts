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
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class UiLayout implements OnDestroy {
  selectedSchool = '';
  schools: { value: string, label: string }[] = [];
  rawSchools: any[] = [];
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
    // AuthStore.user is now auto-fetched on bootstrap and after login —
    // it's the canonical source of truth for the current user
    const profile = this.authStore.user();
    if (!profile) return '';
    return profile.display_name || profile.email || '';
  }

  get isStaff(): boolean {
    if (!this.authStore.isAuthenticated()) return false;
    return this.authStore.user()?.is_staff === true;
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
    
    // Automatically set the school to the user's verified school once the profile loads
    // (if they haven't manually chosen a school yet).
    effect(() => {
      const profile = this.authStore.user();
      if (profile?.school && this.rawSchools.length > 0 && this.schoolStateService.getManualSchool() === null) {
        const userSchool = this.rawSchools.find(s => s.id === profile.school);
        if (userSchool && this.selectedSchool !== userSchool.name) {
          this.selectedSchool = userSchool.name;
          this.schoolStateService.setSchool(this.selectedSchool);
          this.cdr.markForCheck();
        }
      }
    });
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
          this.rawSchools = data.schools;
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
          if (manualSchool !== null && this.schools.some(s => s.value === manualSchool)) {
            this.selectedSchool = manualSchool;
            this.schoolStateService.setSchool(this.selectedSchool);
            this.cdr.markForCheck();
            return;
          }

          // Default to "All Schools" — unless the user's profile has already
          // resolved by now. The effect below only re-runs when the profile
          // signal itself changes, so if the profile arrived *before* this
          // metadata call finished, that effect already ran once with an
          // empty `rawSchools` and did nothing — it will never fire again to
          // correct us. Checking the signal directly here closes that gap
          // regardless of which of the two requests happens to resolve first.
          const profile = this.authStore.user();
          const userSchool = profile?.school ? this.rawSchools.find(s => s.id === profile.school) : undefined;
          this.selectedSchool = userSchool ? userSchool.name : '';
          this.schoolStateService.setSchool(this.selectedSchool);
          this.cdr.markForCheck();
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
