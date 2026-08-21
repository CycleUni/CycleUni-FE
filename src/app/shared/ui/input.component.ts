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
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }
    .input-wrapper.no-margin {
      margin-bottom: 0;
    }
    label {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--ink);
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-2) var(--space-3);
      min-height: 40px;
      /* --line is the decorative hairline (1.5:1 on paper); a field the user
         is meant to click into is an interactive boundary and needs the 3:1
         weight, or the input reads as floating text with no affordance. */
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-control);
      font-size: var(--text-base);
      font-family: inherit;
      color: var(--ink);
      background-color: var(--paper);
    }
    /* Touch: full 44pt target, and >=16px text because iOS Safari auto-zooms
       the viewport on focus for anything smaller and never zooms back out. */
    @media (pointer: coarse) {
      input {
        min-height: var(--tap-min);
        font-size: 16px;
      }
    }
    /* Focus recolours the underline to --accent and adds no thickness. The
       green line clears 3:1 against the field background on its own (7.85:1
       light, 5.36:1 dark), which is what WCAG 1.4.11 (AA) asks of a state
       indicator. The luminance delta between --ink and --accent is only
       1.88:1, so this deliberately stops short of 2.4.13 Focus Appearance
       (AAA) — a product decision, not an oversight; the two states are told
       apart by hue rather than brightness.
       Do not replace the transparent outline with 'outline: none'. It draws
       nothing in normal rendering, but forced-colors mode swaps it for the
       user's own focus colour — something a recoloured border cannot do, so
       deleting it would leave High Contrast users with no focus indicator. */
    input:focus-visible {
      border-bottom-color: var(--accent);
      outline: 2px solid transparent;
    }
    input:disabled {
      background-color: var(--paper-warm);
      cursor: not-allowed;
    }
    .error {
      color: var(--danger);
      font-size: var(--text-xs);
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
