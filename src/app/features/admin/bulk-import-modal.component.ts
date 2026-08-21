import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AdminService } from '../../core/services/admin.service';
import { TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-bulk-import-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TPipe],
  template: `
    <div class="admin-modal-overlay" *ngIf="show">
      <div class="admin-modal import-modal">
        <h3>{{ 'admin.bulkImport' | t }}</h3>

        <div *ngIf="step === 'input'">
          <div class="form-group">
            <label>JSON URL (optional)</label>
            <div class="url-input-row">
              <input type="text" class="input" [(ngModel)]="jsonUrl" placeholder="https://example.com/data.json">
              <button type="button" class="admin-btn admin-btn-sm admin-btn-outline" (click)="fetchJson()" [disabled]="loading">
                {{ loading && loadingAction === 'fetch' ? 'Fetching...' : 'Fetch' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Or Paste JSON</label>
            <textarea class="input json-textarea" [(ngModel)]="jsonText" [placeholder]="sampleFormat"></textarea>
          </div>
          <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
        </div>

        <div *ngIf="step === 'preview'">
          <div class="summary-section">
            <h4>Summary</h4>
            <ul class="summary-list">
              <li>New: {{ newCount }}</li>
              <li>Modified: {{ modifiedCount }}</li>
              <li>Unchanged: {{ unchangedCount }}</li>
            </ul>
            <div class="hint" *ngIf="totalCount === 0">No valid changes found in preview result.</div>
          </div>
          <div class="warning" *ngIf="warningMsg">{{ warningMsg }}</div>
          <div class="diff-section" *ngIf="diff.new?.length">
            <h4>New Items ({{ diff.new.length }})</h4>
            <div class="diff-box">
              <pre *ngFor="let text of previewNewItems">{{ text }}</pre>
            </div>
            <div class="hint" *ngIf="hiddenNewCount > 0">{{ hiddenNewCount }} more new item(s) not shown.</div>
          </div>
          <div class="diff-section" *ngIf="diff.modified?.length">
            <h4>Modified Items ({{ diff.modified.length }})</h4>
            <div class="diff-box diff-modified">
              <div *ngFor="let item of previewModifiedItems" class="diff-item">
                <div class="old">Old: <pre>{{ item.oldText }}</pre></div>
                <div class="new">New: <pre>{{ item.newText }}</pre></div>
              </div>
            </div>
            <div class="hint" *ngIf="hiddenModifiedCount > 0">{{ hiddenModifiedCount }} more modified item(s) not shown.</div>
          </div>
          <div class="diff-section" *ngIf="diff.unchanged?.length">
            <h4>Unchanged Items ({{ diff.unchanged.length }})</h4>
          </div>
          <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
        </div>

        <div class="admin-modal-actions">
          <button type="button" class="admin-btn admin-btn-secondary" (click)="close.emit()">{{ 'common.cancel' | t }}</button>
          <button type="button" *ngIf="step === 'input'" class="admin-btn admin-btn-primary" (click)="preview()" [disabled]="loading">
            {{ loading && loadingAction === 'preview' ? 'Previewing...' : 'Preview' }}
          </button>
          <button type="button" *ngIf="step === 'preview'" class="admin-btn admin-btn-primary" (click)="apply()" [disabled]="loading">
            {{ loading && loadingAction === 'apply' ? 'Applying...' : 'Apply Changes' }}
          </button>
        </div>
        <div class="loading-note" *ngIf="loading">{{ loadingText }}</div>
      </div>
    </div>
  `,
  styles: [`
    .import-modal { background: var(--paper); padding: 24px; border-radius: 8px; width: 600px; max-width: 90%; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
    .input { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; box-sizing: border-box; font-family: inherit; }
    .url-input-row { display: flex; gap: 8px; }
    .json-textarea { min-height: 250px; font-family: monospace; font-size: 13px; }
    .loading-note { margin-top: 8px; font-size: 13px; color: var(--muted); text-align: right; }
    .error { color: #dc2626; margin-bottom: 16px; font-size: 14px; }
    .warning { color: var(--ink); margin-bottom: 16px; font-size: 14px; }
    .hint { color: var(--ink); font-size: 13px; }
    .summary-section { margin-bottom: 16px; }
    .summary-section h4 { margin: 0 0 8px 0; color: var(--ink); }
    .summary-list { margin: 0 0 8px 0; padding-left: 18px; }
    
    .diff-section { margin-bottom: 24px; }
    .diff-section h4 { margin: 0 0 8px 0; color: var(--ink); }
    .diff-box { background: var(--paper-warm); padding: 12px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-size: 12px; font-family: monospace; }
    .diff-item { border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 8px; }
    .diff-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .old { color: #dc2626; }
    .new { color: #16a34a; }
  `]
})
export class BulkImportModalComponent {
  readonly PREVIEW_ITEM_LIMIT = 50;

  @Input() show = false;
  @Input() endpoint!: 'schools' | 'categories';
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  get sampleFormat(): string {
    if (this.endpoint === 'schools') {
      return `[
  {
    "name": "國立臺灣大學",
    "email_domain": "ntu.edu.tw",
    "translations": {
      "en": { "name": "National Taiwan University" },
      "zh-TW": { "name": "國立臺灣大學" }
    }
  }
]`;
    } else {
      return `[
  {
    "slug": "csci",
    "title": "資訊工程",
    "description": "資訊相關科系",
    "sort_order": 10,
    "is_active": true,
    "translations": {
      "en": {
        "title": "Computer Science",
        "description": "CS related departments"
      },
      "zh-TW": {
        "title": "資訊工程",
        "description": "資訊相關科系"
      }
    }
  }
]`;
    }
  }

  private adminService = inject(AdminService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  step: 'input' | 'preview' = 'input';
  jsonUrl = '';
  jsonText = '';
  errorMsg = '';
  warningMsg = '';
  loading = false;
  loadingAction: 'fetch' | 'preview' | 'apply' | null = null;
  diff: any = {};
  parsedItems: any[] = [];
  previewNewItems: string[] = [];
  previewModifiedItems: Array<{ oldText: string; newText: string }> = [];
  hiddenNewCount = 0;
  hiddenModifiedCount = 0;
  
  get newCount(): number { return this.diff.new?.length ?? 0; }
  get modifiedCount(): number { return this.diff.modified?.length ?? 0; }
  get unchangedCount(): number { return this.diff.unchanged?.length ?? 0; }
  get totalCount(): number { return this.newCount + this.modifiedCount + this.unchangedCount; }
  get loadingText(): string {
    if (!this.loading) return '';
    if (this.loadingAction === 'fetch') return 'Fetching JSON...';
    if (this.loadingAction === 'preview') return 'Preparing preview, please wait...';
    if (this.loadingAction === 'apply') return 'Applying changes, please wait...';
    return 'Processing...';
  }

  fetchJson() {
    if (!this.jsonUrl) return;
    this.loading = true;
    this.loadingAction = 'fetch';
    this.errorMsg = '';
    this.http.get(this.jsonUrl).subscribe({
      next: (data: any) => {
        this.jsonText = JSON.stringify(data, null, 2);
        this.loading = false;
        this.loadingAction = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = 'Failed to fetch JSON from URL. (Check CORS)';
        this.loading = false;
        this.loadingAction = null;
        this.cdr.markForCheck();
      }
    });
  }

  preview() {
    this.errorMsg = '';
    this.warningMsg = '';
    try {
      const parsed = JSON.parse(this.jsonText);
      if (Array.isArray(parsed)) {
        this.parsedItems = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        this.parsedItems = parsed.items;
      } else {
        throw new Error('JSON format must be an array [...] or an object with items array { "items": [...] }');
      }
    } catch (e: any) {
      this.errorMsg = 'Invalid JSON: ' + e.message;
      return;
    }

    if (!this.parsedItems.length) {
      this.errorMsg = 'No items found. Please provide at least one item.';
      return;
    }

    const validItems: any[] = [];
    let invalidCount = 0;
    for (const item of this.parsedItems) {
      if (this.isValidItem(item)) {
        validItems.push(item);
      } else {
        invalidCount += 1;
      }
    }
    if (!validItems.length) {
      this.errorMsg = this.endpoint === 'schools'
        ? 'All items are invalid. Each school item requires a non-empty "email_domain".'
        : 'All items are invalid. Each category item requires a non-empty "slug".';
      return;
    }
    if (invalidCount > 0) {
      this.warningMsg = `${invalidCount} invalid item(s) were skipped.`;
    }
    this.parsedItems = validItems;

    this.loading = true;
    this.loadingAction = 'preview';
    this.adminService.bulkImport(this.endpoint, 'preview', this.parsedItems).subscribe({
      next: (diff: any) => {
        this.diff = diff;
        this.buildPreviewDiff(diff);
        this.step = 'preview';
        this.loading = false;
        this.loadingAction = null;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.errorMsg = 'Preview failed: ' + (err.error?.error || err.message);
        this.loading = false;
        this.loadingAction = null;
        this.cdr.markForCheck();
      }
    });
  }

  private buildPreviewDiff(diff: any): void {
    const previewLimit = this.PREVIEW_ITEM_LIMIT;
    const newItems = Array.isArray(diff?.new) ? diff.new : [];
    const modifiedItems = Array.isArray(diff?.modified) ? diff.modified : [];

    this.previewNewItems = newItems
      .slice(0, previewLimit)
      .map((item: unknown) => this.stringifyForPreview(item));
    this.hiddenNewCount = Math.max(newItems.length - this.previewNewItems.length, 0);

    this.previewModifiedItems = modifiedItems
      .slice(0, previewLimit)
      .map((item: any) => ({
        oldText: this.stringifyForPreview(item?.old),
        newText: this.stringifyForPreview(item?.new),
      }));
    this.hiddenModifiedCount = Math.max(modifiedItems.length - this.previewModifiedItems.length, 0);
  }

  private stringifyForPreview(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Unserializable item]';
    }
  }

  private isValidItem(item: any): boolean {
    if (!item || typeof item !== 'object') return false;
    if (this.endpoint === 'schools') {
      return typeof item.email_domain === 'string' && item.email_domain.trim().length > 0;
    }
    return typeof item.slug === 'string' && item.slug.trim().length > 0;
  }

  apply() {
    this.loading = true;
    this.loadingAction = 'apply';
    this.adminService.bulkImport(this.endpoint, 'apply', this.parsedItems).subscribe({
      next: () => {
        this.loading = false;
        this.loadingAction = null;
        this.imported.emit();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.errorMsg = 'Import failed: ' + (err.error?.error || err.message);
        this.loading = false;
        this.loadingAction = null;
        this.cdr.markForCheck();
      }
    });
  }
}
