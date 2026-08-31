import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-checkbox',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckbox),
      multi: true
    }
  ],
  template: `
    <label class="checkbox-wrapper" [class.disabled]="disabled">
      <input
        type="checkbox"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onCheckboxChange($event)"
        (blur)="onTouched()"
      />
      <span class="label-text" *ngIf="label">{{ label }}</span>
      <ng-content></ng-content>
    </label>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .checkbox-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      min-height: var(--tap-min);
    }
    .checkbox-wrapper.disabled {
      cursor: not-allowed;
    }
    input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      margin: 0;
      width: 18px;
      height: 18px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-xs);
      background-color: var(--paper);
      cursor: inherit;
      display: grid;
      place-content: center;
      flex-shrink: 0;
    }
    input[type="checkbox"]::before {
      content: "";
      width: 10px;
      height: 10px;
      background-color: var(--btn-primary-ink);
      clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
      transform: scale(0);
      transition: transform var(--motion-fast) ease-in-out;
    }
    input[type="checkbox"]:checked {
      background-color: var(--accent);
      border-color: var(--accent);
    }
    input[type="checkbox"]:checked::before {
      transform: scale(1);
    }
    input[type="checkbox"]:disabled {
      background-color: var(--paper-warm);
      border-color: var(--line);
    }
    input[type="checkbox"]:disabled:checked {
      background-color: var(--muted);
      border-color: var(--muted);
    }
    .label-text {
      font-size: var(--text-base);
      color: var(--ink);
    }
    .checkbox-wrapper.disabled .label-text {
      color: var(--muted);
    }
  `]
})
export class UiCheckbox implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() set checked(val: boolean | undefined | null) { this._checked = !!val; }
  get checked(): boolean { return this._checked; }
  private _checked = false;

  @Output() change = new EventEmitter<boolean>();

  onChange = (val: boolean) => {};
  onTouched = () => {};

  onCheckboxChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.checked = isChecked;
    this.onChange(isChecked);
    this.change.emit(isChecked);
  }

  writeValue(val: any): void {
    this.checked = !!val;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
