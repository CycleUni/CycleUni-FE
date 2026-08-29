import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCurrency } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { parseAdminError } from '../../core/admin-error.util';

@Component({
  selector: 'app-admin-currency-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe],
  template: `
    <div class="admin-detail-header" *ngIf="item">
      <a routerLink=".." class="admin-back-link">&larr; {{ 'common.back' | t }}</a>
      <h2>{{ 'admin.editCurrency' | t }} - {{ item.code }}</h2>
    </div>

    <div class="admin-card" *ngIf="item">
      <div class="form-group">
        <label>{{ 'admin.currencyCode' | t }}</label>
        <input type="text" class="admin-form-control" [value]="item.code" disabled>
      </div>
      <div class="form-group">
        <label>{{ 'admin.currencySymbol' | t }}</label>
        <input type="text" class="admin-form-control" [(ngModel)]="item.symbol">
      </div>
      <div class="form-group">
        <label>{{ 'admin.currencyDecimals' | t }}</label>
        <p class="text-hint">{{ 'admin.decimalsWarning' | t }}</p>
        <input type="number" class="admin-form-control" [(ngModel)]="item.decimal_places" disabled>
      </div>
      <div class="form-group">
        <label>{{ 'admin.currencySymbolPos' | t }}</label>
        <select class="admin-form-control" [(ngModel)]="item.symbol_position">
          <option value="prefix">prefix</option>
          <option value="suffix">suffix</option>
        </select>
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
    .mt-3 { margin-top: 24px; }
    .text-hint { font-size: 13px; color: var(--text-muted); margin-top: -4px; margin-bottom: 8px; }
  `]
})
export class AdminCurrencyDetailComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private i18n = inject(I18nService);

  item?: AdminCurrency;
  saving = false;

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('id');
    if (code) {
      this.adminService.getCurrency(code).subscribe({
        next: (res) => {
          this.item = res;
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['..'], { relativeTo: this.route })
      });
    }
  }

  save() {
    if (!this.item) return;
    this.saving = true;
    this.cdr.markForCheck();
    
    // Create a copy and remove immutable fields just in case
    const payload = { ...this.item };
    delete (payload as any).code;
    delete (payload as any).decimal_places;

    this.adminService.updateCurrency(this.item.code, payload).subscribe({
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
