import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="input-wrapper" [class.no-margin]="noMargin">
      <label *ngIf="label">{{ label }}</label>
      <input
        [type]="type"
        [placeholder]="placeholder"
        [value]="value"
        [disabled]="disabled"
        (input)="onInputChange($event)"
        (blur)="onTouched()"
      />
      <span class="error" *ngIf="error">{{ error }}</span>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInput),
      multi: true
    }
  ],
  styles: [`
    :host {
      display: block;
    }
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }
    .input-wrapper.no-margin {
      margin-bottom: 0;
    }
    label {
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      color: var(--ink);
      background-color: var(--paper);
    }
    input:focus {
      outline: none;
      border-color: var(--accent);
    }
    input:disabled {
      background-color: var(--paper-warm);
      cursor: not-allowed;
    }
    .error {
      color: var(--flag);
      font-size: 12px;
    }
  `]
})
export class UiInput implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() error: string = '';
  @Input() noMargin: boolean = false;
  
  value: string = '';
  disabled: boolean = false;

  onChange = (val: string) => {};
  onTouched = () => {};

  onInputChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }

  writeValue(val: any): void {
    this.value = (val !== null && val !== undefined) ? String(val) : '';
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
