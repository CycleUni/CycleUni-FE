import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FacetOption {
  label: string;
  value: string;
  count?: number;
  selected: boolean;
}

/**
 * `facet-list`: a plain-text filter/facet list — a lighter "editorial"
 * alternative to boxed dropdowns/checkboxes. Each option renders as a row
 * with a small circular dot indicator, label, and optional trailing count.
 *
 * Presentational only: it does not own selection state or single/multi
 * behavior — the parent listens to `optionToggle` and decides how to
 * mutate `options` (radio-like single-select or checkbox-like multi-select).
 */
@Component({
  selector: 'ui-facet-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="facet-group">
      <h4 class="facet-title" *ngIf="title">{{ title }}</h4>
      <ul class="facet-list">
        <li
          class="facet-option"
          *ngFor="let option of options"
          [class.selected]="option.selected"
          (click)="optionToggle.emit(option.value)"
        >
          <span class="facet-dot"></span>
          <span class="facet-label">{{ option.label }}</span>
          <span class="facet-count" *ngIf="option.count !== undefined">{{ option.count }}</span>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .facet-group {
      /* No external margin here on purpose: this component is embedded in
         varying layouts (e.g. search.ts's .filter-group already provides
         divider + spacing between groups) — imposing our own margin here
         double-stacked with the parent's, producing an oversized gap. */
    }
    .facet-title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    .facet-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .facet-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: var(--ink);
    }
    .facet-dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid var(--line);
      box-sizing: border-box;
    }
    .facet-option.selected .facet-dot {
      background: var(--accent);
      border-color: var(--accent);
    }
    .facet-option.selected .facet-label {
      font-weight: 500;
    }
    .facet-label {
      flex: 1;
    }
    .facet-count {
      color: var(--muted);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class UiFacetList {
  @Input() title: string = '';
  @Input() options: FacetOption[] = [];

  @Output() optionToggle = new EventEmitter<string>();
}
