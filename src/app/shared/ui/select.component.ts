import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="select-wrapper">
      <label *ngIf="label">{{ label }}</label>
      <select [disabled]="disabled" (change)="onSelectChange($event)" (blur)="onTouched()">
        <option *ngFor="let option of options" [value]="option.value" [selected]="option.value === value">
          {{ option.label }}
        </option>
      </select>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelect),
      multi: true
    }
  ],
  styles: [`
    .select-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }
    label {
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    select {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      font-size: 14px;
      font-family: inherit;
      color: var(--ink);
      background-color: var(--paper);
    }
    /* No outline reset. The global :focus-visible ring in styles.css is the
       focus indicator; a border-colour swap alone is ~1.9:1 on a 1px line. */
    select:focus-visible {
      border-color: var(--accent);
    }
    select:disabled {
      background-color: var(--paper-warm);
      cursor: not-allowed;
    }
  `]
})
export class UiSelect implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: { value: string; label: string }[] = [];
  
  value: string = '';
  disabled: boolean = false;

  onChange = (val: string) => {};
  onTouched = () => {};

  onSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.value = val;
    this.onChange(val);
  }

  writeValue(val: string): void {
    this.value = val || '';
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
