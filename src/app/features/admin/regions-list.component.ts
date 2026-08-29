import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPagination } from '../../shared/ui/pagination.component';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminRegion, Paginated, AdminCurrency } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { parseAdminError } from '../../core/admin-error.util';
import { Lang } from '../../core/i18n';

@Component({
  selector: 'app-admin-regions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiPagination],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navRegions' | t }}</h2>
      <button class="admin-btn admin-btn-primary" (click)="openCreateModal()">{{ 'admin.addRegion' | t }}</button>
    </div>

    <div class="table-container" *ngIf="data">
      <table class="admin-table">
        <thead>
          <tr>
            <th>{{ 'admin.regionCode' | t }}</th>
            <th>{{ 'admin.regionName' | t }}</th>
            <th>{{ 'admin.regionCurrency' | t }}</th>
            <th>{{ 'admin.regionIsActive' | t }}</th>
            <th>{{ 'admin.colActions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of data.results">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.currency }}</td>
            <td>{{ item.is_active ? ('admin.yes' | t) : ('admin.no' | t) }}</td>
            <td>
              <a class="admin-btn admin-btn-sm admin-btn-outline" [routerLink]="[item.code]">{{ 'common.edit' | t }}</a>
            </td>
          </tr>
        </tbody>
      </table>
      <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="currentPage" (pageChange)="loadPage($event)"></ui-pagination>
    </div>

    <div class="app-modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
      <div class="app-modal" style="width: 550px; max-width: 95%; max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
        <h3 class="app-modal-title">{{ 'admin.addRegion' | t }}</h3>
        <div class="app-modal-body">
          <div class="form-group">
            <label>{{ 'admin.regionCode' | t }} (ISO 3166-1 alpha-2)</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.code">
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionName' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.name">
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionCurrency' | t }}</label>
            <select class="admin-form-control" [(ngModel)]="newItem.currency">
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
            <select class="admin-form-control" [(ngModel)]="newItem.default_language">
              <option *ngFor="let lang of newItem.languages" [value]="lang">{{ lang }}</option>
            </select>
            <div *ngIf="defaultLangError" class="text-danger mt-1">{{ defaultLangError | t }}</div>
          </div>
          <div class="form-group">
            <label>{{ 'admin.translationsSection' | t }}</label>
            <div *ngFor="let lang of newItem.languages" class="translation-row">
              <span class="lang-tag">{{ lang }}</span>
              <input type="text" class="admin-form-control" [placeholder]="'admin.regionName' | t" [(ngModel)]="newTranslations[lang]">
            </div>
            <div *ngIf="transError" class="text-danger mt-1">{{ transError | t }}</div>
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionTimezone' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.timezone" placeholder="Asia/Taipei">
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionEduSuffix' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.edu_email_suffix" placeholder=".edu.tw">
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionSearchEngines' | t }}</label>
            <div class="checkbox-group">
              <label *ngFor="let se of allSearchEngines"><input type="checkbox" [checked]="hasSearchEngine(se)" (change)="toggleSearchEngine(se)"> {{ se }}</label>
            </div>
          </div>
          <div class="form-group">
            <label>{{ 'admin.regionSortOrder' | t }}</label>
            <input type="number" class="admin-form-control" [(ngModel)]="newItem.sort_order">
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" [(ngModel)]="newItem.is_active">
              {{ 'admin.regionIsActive' | t }}
            </label>
          </div>
        </div>
        <div class="app-modal-actions">
          <button class="admin-btn admin-btn-secondary" (click)="showCreateModal = false">{{ 'common.cancel' | t }}</button>
          <button class="admin-btn admin-btn-primary" (click)="create()">{{ 'admin.save' | t }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
    .checkbox-group { display: flex; gap: 16px; flex-wrap: wrap; }
    .checkbox-group label { display: flex; align-items: center; gap: 4px; font-weight: normal; margin-bottom: 0; }
    .text-hint { font-size: 13px; color: var(--text-muted); margin-top: -4px; margin-bottom: 8px; }
    .text-danger { font-size: 13px; color: #dc3545; }
    .mt-1 { margin-top: 4px; }
    .translation-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .lang-tag { flex: 0 0 auto; padding: 4px 8px; border-radius: 4px; background: var(--paper-warm); font-size: 12px; font-weight: 600; width: 60px; text-align: center; }
  `]
})
export class AdminRegionsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);

  data?: Paginated<AdminRegion>;
  currencies: AdminCurrency[] = [];
  currentPage = 1;
  total = 0;
  pageSize = 20;

  showCreateModal = false;
  newItem: Partial<AdminRegion> = this.getEmptyItem();
  newTranslations: Record<string, string> = {};
  
  // Available langs from frontend dictionary constraint
  availableLangs: string[] = ['en', 'zh-TW', 'zh-HK'];
  allSearchEngines = ['googlebooks', 'openlibrary', 'isbnnet'];
  
  langError = '';
  defaultLangError = '';
  transError = '';

  ngOnInit() {
    this.loadPage(1);
    this.adminService.getCurrencies().subscribe(res => {
      this.currencies = Array.isArray(res) ? res : res.results;
      this.cdr.markForCheck();
    });
  }

  getEmptyItem(): Partial<AdminRegion> {
    return { 
      code: '', name: '', currency: '', default_language: 'en', 
      languages: ['en'], timezone: 'Asia/Taipei', search_engines: ['openlibrary'],
      edu_email_suffix: '', is_active: true, sort_order: 0 
    };
  }

  loadPage(page: number) {
    this.currentPage = page;
    this.adminService.getRegions().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
           this.data = { count: res.length, results: res, next: null, previous: null } as any;
           this.total = res.length;
        } else {
           this.data = res;
           this.total = res.count;
        }
        this.cdr.markForCheck();
      }
    });
  }

  openCreateModal() {
    this.newItem = this.getEmptyItem();
    this.newTranslations = {};
    this.langError = '';
    this.transError = '';
    this.defaultLangError = '';
    this.showCreateModal = true;
  }

  hasLang(lang: string) { return this.newItem.languages?.includes(lang); }
  toggleLang(lang: string) {
    let langs = this.newItem.languages || [];
    if (langs.includes(lang)) langs = langs.filter(l => l !== lang);
    else langs = [...langs, lang];
    this.newItem.languages = langs;
    if (!langs.includes(this.newItem.default_language!)) {
      this.newItem.default_language = langs[0] || '';
    }
  }

  hasSearchEngine(se: string) { return this.newItem.search_engines?.includes(se); }
  toggleSearchEngine(se: string) {
    let ses = this.newItem.search_engines || [];
    if (ses.includes(se)) ses = ses.filter(s => s !== se);
    else ses = [...ses, se];
    this.newItem.search_engines = ses;
  }

  create() {
    this.langError = '';
    this.transError = '';
    this.defaultLangError = '';
    
    if (!this.newItem.languages || this.newItem.languages.length === 0) {
      this.langError = 'admin.languagesRequired';
      return;
    }
    if (!this.newItem.languages.includes(this.newItem.default_language!)) {
      this.defaultLangError = 'admin.defaultLanguageMustBeInLanguages';
      return;
    }
    
    let hasTrans = false;
    const transData: any = {};
    for (const lang of this.newItem.languages) {
      if (this.newTranslations[lang]?.trim()) {
        transData[lang] = { name: this.newTranslations[lang].trim() };
        hasTrans = true;
      }
    }
    if (!hasTrans) {
      this.transError = 'admin.translationsRequired';
      return;
    }
    this.newItem.translations = transData;
    
    this.adminService.createRegion(this.newItem).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadPage(1);
      },
      error: (err) => alert(parseAdminError(err, this.i18n))
    });
  }
}
