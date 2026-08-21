import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/i18n.service';

export interface TranslationField {
  key: string;
  placeholder: string;
  type: 'text' | 'textarea';
}

@Component({
  selector: 'app-translation-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe],
  template: `
    <div class="translation-item" *ngFor="let t of translationsList; let i = index">
      <div class="translation-header">
        <input type="text" class="input lang-input" [(ngModel)]="t.lang" (ngModelChange)="onChange()" placeholder="Language (e.g. en)">
        <button class="admin-btn admin-btn-sm admin-btn-danger" (click)="removeTranslation(i)">{{ 'common.delete' | t }}</button>
      </div>
      <div class="translation-row" *ngFor="let field of fields">
        <input *ngIf="field.type === 'text'" type="text" class="input" [(ngModel)]="t.data[field.key]" (ngModelChange)="onChange()" [placeholder]="field.placeholder | t">
        <textarea *ngIf="field.type === 'textarea'" class="input" [(ngModel)]="t.data[field.key]" (ngModelChange)="onChange()" [placeholder]="field.placeholder | t"></textarea>
      </div>
    </div>
    <button class="admin-btn admin-btn-sm admin-btn-outline mt-2" (click)="addTranslation()">+ Add Language</button>
  `,
  styles: [`
    .translation-item { background: var(--paper-warm); padding: 12px; border-radius: 6px; border: 1px solid var(--line); margin-bottom: 8px; }
    .translation-header { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .translation-row { margin-bottom: 8px; }
    .translation-row:last-child { margin-bottom: 0; }
    .lang-input { width: 150px; font-weight: 600; }
    .mt-2 { margin-top: 8px; }
    .input { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; box-sizing: border-box; font-family: inherit; }
    textarea.input { min-height: 80px; resize: vertical; }
  `]
})
export class TranslationEditorComponent {
  @Input() fields: TranslationField[] = [];
  
  _translations: any = {};
  @Input() set translations(val: any) {
    this._translations = val || {};
    this.translationsList = Object.keys(this._translations).map(lang => ({
      lang,
      data: { ...this._translations[lang] }
    }));
  }
  @Output() translationsChange = new EventEmitter<any>();

  translationsList: { lang: string, data: any }[] = [];

  addTranslation() {
    this.translationsList.push({ lang: '', data: {} });
    this.onChange();
  }

  removeTranslation(index: number) {
    this.translationsList.splice(index, 1);
    this.onChange();
  }

  onChange() {
    const newTrans: any = {};
    for (const t of this.translationsList) {
      if (t.lang.trim()) {
        const langData: any = {};
        for (const f of this.fields) {
          if (t.data[f.key] && t.data[f.key].trim()) {
            langData[f.key] = t.data[f.key].trim();
          }
        }
        if (Object.keys(langData).length > 0) {
          newTrans[t.lang.trim()] = langData;
        }
      }
    }
    this.translationsChange.emit(newTrans);
  }
}
