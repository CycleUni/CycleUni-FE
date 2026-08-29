import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminRegion, AdminCurrency } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { parseAdminError } from '../../core/admin-error.util';
import { Lang } from '../../core/i18n';

@Component({
  selector: 'app-admin-region-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe],
  template: `
    <div class="admin-detail-header" *ngIf="item">
      <a routerLink=".." class="admin-back-link">&larr; {{ 'common.back' | t }}</a>
      <h2>{{ 'admin.editRegion' | t }} - {{ item.code }}</h2>
    </div>

    <div class="admin-card" *ngIf="item">
      <div class="form-group">
        <label>{{ 'admin.regionCode' | t }}</label>
        <input type="text" class="admin-form-control" [value]="item.code" disabled>
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionName' | t }}</label>
        <input type="text" class="admin-form-control" [(ngModel)]="item.name">
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionCurrency' | t }}</label>
        <select class="admin-form-control" [(ngModel)]="item.currency">
          <option *ngFor="let c of currencies" [value]="c.code">{{ c.code }} ({{ c.symbol }})</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionLanguages' | t }}</label>
        <p class="text-hint">{{ 'admin.langNotice' | t }}</p>
        <div class="checkbox-group">
          <label *ngFor="let lang of availableLangs"><input type="checkbox" [checked]="hasLang(lang)" (change)="toggleLang(lang)"> {{ lang }}</label>
        </div>
        <div *ngIf="langError" class="text-danger mt-1">{{ langError | t }}</div>
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionDefaultLang' | t }}</label>
        <select class="admin-form-control" [(ngModel)]="item.default_language">
          <option *ngFor="let lang of item.languages" [value]="lang">{{ lang }}</option>
        </select>
        <div *ngIf="defaultLangError" class="text-danger mt-1">{{ defaultLangError | t }}</div>
      </div>
      <div class="form-group">
        <label>{{ 'admin.translationsSection' | t }}</label>
        <div *ngFor="let lang of item.languages" class="translation-row">
          <span class="lang-tag">{{ lang }}</span>
          <input type="text" class="admin-form-control" [placeholder]="'admin.regionName' | t" [(ngModel)]="translations[lang]">
        </div>
        <div *ngIf="transError" class="text-danger mt-1">{{ transError | t }}</div>
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionTimezone' | t }}</label>
        <input type="text" class="admin-form-control" [(ngModel)]="item.timezone" placeholder="Asia/Taipei">
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionEduSuffix' | t }}</label>
        <input type="text" class="admin-form-control" [(ngModel)]="item.edu_email_suffix" placeholder=".edu.tw">
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionSearchEngines' | t }}</label>
        <div class="checkbox-group">
          <label *ngFor="let se of allSearchEngines"><input type="checkbox" [checked]="hasSearchEngine(se)" (change)="toggleSearchEngine(se)"> {{ se }}</label>
        </div>
      </div>
      <div class="form-group">
        <label>{{ 'admin.regionSortOrder' | t }}</label>
        <input type="number" class="admin-form-control" [(ngModel)]="item.sort_order">
      </div>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" [(ngModel)]="item.is_active">
          {{ 'admin.regionIsActive' | t }}
        </label>
      </div>
      
      <button class="admin-btn admin-btn-primary mt-3" [disabled]="saving" (click)="save()">
        {{ saving ? ('admin.saving' | t) : ('admin.save' | t) }}
      </button>
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
    .checkbox-group { display: flex; gap: 16px; flex-wrap: wrap; }
    .checkbox-group label { display: flex; align-items: center; gap: 4px; font-weight: normal; margin-bottom: 0; }
    .text-hint { font-size: 13px; color: var(--text-muted); margin-top: -4px; margin-bottom: 8px; }
    .text-danger { font-size: 13px; color: #dc3545; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 24px; }
    .translation-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .lang-tag { flex: 0 0 auto; padding: 4px 8px; border-radius: 4px; background: var(--paper-warm); font-size: 12px; font-weight: 600; width: 60px; text-align: center; }
  `]
})
export class AdminRegionDetailComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private i18n = inject(I18nService);

  item?: AdminRegion;
  currencies: AdminCurrency[] = [];
  saving = false;

  availableLangs: string[] = ['en', 'zh-TW', 'zh-HK'];
  allSearchEngines = ['googlebooks', 'openlibrary', 'isbnnet'];
  translations: Record<string, string> = {};

  langError = '';
  defaultLangError = '';
  transError = '';

  ngOnInit() {
    this.adminService.getCurrencies().subscribe(res => {
      this.currencies = Array.isArray(res) ? res : res.results;
      this.cdr.markForCheck();
    });
    
    const code = this.route.snapshot.paramMap.get('id');
    if (code) {
      this.adminService.getRegion(code).subscribe({
        next: (res) => {
          this.item = res;
          this.translations = {};
          if (res.translations) {
            for (const lang of Object.keys(res.translations)) {
              if (res.translations[lang]?.name) {
                this.translations[lang] = res.translations[lang].name;
              }
            }
          }
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['..'], { relativeTo: this.route })
      });
    }
  }

  hasLang(lang: string) { return this.item?.languages?.includes(lang); }
  toggleLang(lang: string) {
    if (!this.item) return;
    let langs = this.item.languages || [];
    if (langs.includes(lang)) langs = langs.filter(l => l !== lang);
    else langs = [...langs, lang];
    this.item.languages = langs;
    if (!langs.includes(this.item.default_language!)) {
      this.item.default_language = langs[0] || '';
    }
  }

  hasSearchEngine(se: string) { return this.item?.search_engines?.includes(se); }
  toggleSearchEngine(se: string) {
    if (!this.item) return;
    let ses = this.item.search_engines || [];
    if (ses.includes(se)) ses = ses.filter(s => s !== se);
    else ses = [...ses, se];
    this.item.search_engines = ses;
  }

  save() {
    if (!this.item) return;
    this.langError = '';
    this.transError = '';
    this.defaultLangError = '';
    
    if (!this.item.languages || this.item.languages.length === 0) {
      this.langError = 'admin.languagesRequired';
      return;
    }
    if (!this.item.languages.includes(this.item.default_language!)) {
      this.defaultLangError = 'admin.defaultLanguageMustBeInLanguages';
      return;
    }
    
    let hasTrans = false;
    const transData: any = {};
    for (const lang of this.item.languages) {
      if (this.translations[lang]?.trim()) {
        transData[lang] = { name: this.translations[lang].trim() };
        hasTrans = true;
      }
    }
    if (!hasTrans) {
      this.transError = 'admin.translationsRequired';
      return;
    }
    this.item.translations = transData;

    this.saving = true;
    this.cdr.markForCheck();
    
    const payload = { ...this.item };
    delete (payload as any).code;

    this.adminService.updateRegion(this.item.code, payload).subscribe({
      next: () => {
        this.saving = false;
        alert(this.i18n.t('admin.saved'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        alert(parseAdminError(err, this.i18n));
        this.cdr.markForCheck();
      }
    });
  }
}
