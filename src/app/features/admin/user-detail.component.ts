import { Component, OnInit, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { MetadataService } from '../../core/services/metadata.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiButton, UiDropdown],
  template: `
    <a routerLink="../.." class="back-link">&larr; {{ 'admin.backToList' | t }}</a>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <div class="detail-card" *ngIf="!loading && user">
      <h2>{{ user.display_name || user.email }}</h2>

      <div class="field-grid">
        <div class="field"><label>{{ 'admin.colEmail' | t }}</label><span>{{ user.email }}</span></div>
        <div class="field"><label>{{ 'admin.colEduEmail' | t }}</label><span>{{ user.edu_email || '—' }}</span></div>
        <div class="field"><label>{{ 'admin.colName' | t }}</label><span>{{ user.first_name }} {{ user.last_name }}</span></div>
        <div class="field"><label>{{ 'admin.staffBadge' | t }}</label><span class="admin-status-badge" [class.ok]="user.is_staff">{{ (user.is_staff ? 'admin.yes' : 'admin.no') | t }}</span></div>
      </div>

      <ui-dropdown [label]="'admin.colSchool' | t" [options]="schoolOptions" [(ngModel)]="schoolId"></ui-dropdown>

      <div class="toggle-row">
        <label class="toggle">
          <input type="checkbox" [(ngModel)]="isActive" />
          {{ 'admin.colActive' | t }}
        </label>
        <label class="toggle">
          <input type="checkbox" [(ngModel)]="isVerified" />
          {{ 'admin.colVerified' | t }}
        </label>
      </div>

      <div *ngIf="errorMsg" class="inline-msg error">{{ errorMsg }}</div>
      <div *ngIf="savedMsg" class="inline-msg ok">{{ savedMsg }}</div>

      <ui-button (onClick)="save()" [disabled]="saving">{{ (saving ? 'admin.saving' : 'admin.save') | t }}</ui-button>
    </div>
  `,
  styles: [`
    .admin-status-badge { width: fit-content; }
    .back-link {
      display: inline-block;
      margin-bottom: 16px;
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
    }
    .back-link:hover { color: var(--accent); }
    .detail-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 24px;
      max-width: 520px;
      box-shadow: var(--shadow-card-lg);
    }
    .detail-card h2 { margin-top: 0; }
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 12px; color: var(--muted); }
    .field span { font-size: 14px; color: var(--ink); }
    .toggle-row {
      display: flex;
      gap: 24px;
      margin: 16px 0;
    }
    .toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    .inline-msg {
      margin: 12px 0;
      font-size: 14px;
    }
    .inline-msg.error { color: var(--danger); }
    .inline-msg.ok { color: var(--success); }
  `]
})
export class AdminUserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private adminService = inject(AdminService);
  private metadataService = inject(MetadataService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  user: AdminUser | null = null;
  loading = true;
  saving = false;
  errorMsg = '';
  savedMsg = '';

  isActive = false;
  isVerified = false;
  schoolId: string | number | '' = '';
  schools: { id: string | number; name: string; display_name?: string }[] = [];

  get schoolOptions() {
    return [
      { value: '', label: this.i18n.t('admin.noSchool') },
      ...this.schools.map(s => ({ value: String(s.id), label: s.display_name || s.name })),
    ];
  }

  constructor() {
    // School display_name is localized server-side (School.localized_name),
    // so it has to be re-fetched on language switch — same pattern as the
    // header's school selector (layout.component.ts) — otherwise the school
    // list keeps showing whatever language was active when this page first
    // loaded.
    effect(() => {
      this.i18n.lang();
      this.metadataService.getMetadata().subscribe({
        next: (meta) => { this.schools = meta?.schools || []; this.cdr.markForCheck(); },
        error: () => {}
      });
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.adminService.getUser(id).subscribe({
      next: (user) => {
        this.user = user;
        this.isActive = user.is_active;
        this.isVerified = user.is_verified;
        this.schoolId = user.school ? String(user.school) : '';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  save() {
    if (!this.user) return;
    this.saving = true;
    this.errorMsg = '';
    this.savedMsg = '';

    this.adminService.updateUser(this.user.id, {
      is_active: this.isActive,
      verified: this.isVerified,
      school: this.schoolId === '' ? null : this.schoolId,
    }).subscribe({
      next: (updated) => {
        this.user = updated;
        this.saving = false;
        this.savedMsg = this.i18n.t('admin.saved');
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.errorMsg = this.i18n.t('admin.errGeneric');
        this.cdr.markForCheck();
      }
    });
  }
}
