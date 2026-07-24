import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="'ui-btn ' + variant"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
      align-self: stretch;
    }
    .ui-btn {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;
      border: 1px solid transparent;
    }
    .ui-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .primary {
      background-color: var(--accent);
      color: var(--paper);
    }
    .primary:hover:not(:disabled) {
      background-color: var(--accent-ink);
    }
    .ghost {
      background-color: transparent;
      color: var(--ink);
      border-color: var(--line);
    }
    .ghost:hover:not(:disabled) {
      background-color: var(--paper-warm);
    }
    .white {
      background-color: #ffffff;
      color: var(--ink);
      border-color: var(--line);
    }
    .white:hover:not(:disabled) {
      background-color: var(--paper-warm);
    }
  `]
})
export class UiButton {
  @Input() variant: 'primary' | 'ghost' | 'white' = 'primary';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<Event>();
}
