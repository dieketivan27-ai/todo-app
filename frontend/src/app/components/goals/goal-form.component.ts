import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalCreate, CATEGORIES, GOAL_COLORS } from '../../models/task.model';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="modal-backdrop" (click)="onCancel()">
  <div class="modal-box" (click)="$event.stopPropagation()">

    <div class="modal-header">
      <h2>{{ isEdit ? 'Modifier' : 'Nouvel objectif annuel' }}</h2>
      <button class="modal-close" (click)="onCancel()">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="modal-body">
      <!-- Titre -->
      <div class="field-group">
        <label class="field-label">Titre de l'objectif *</label>
        <input [(ngModel)]="form.title" type="text" class="field-input" placeholder="Ex: Terminer 100 tâches Dev cette année" />
      </div>

      <!-- Catégorie -->
      <div class="field-group">
        <label class="field-label">Catégorie</label>
        <select [(ngModel)]="form.category" class="field-input">
          <option value="Toutes">Toutes les catégories</option>
          <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
        </select>
      </div>



      <!-- Année -->
      <div class="field-group">
        <label class="field-label">Année</label>
        <input [(ngModel)]="form.year" type="number" min="2020" max="2035" class="field-input" />
      </div>

      <!-- Description -->
      <div class="field-group">
        <label class="field-label">Description (optionnel)</label>
        <textarea [(ngModel)]="form.description" class="field-input" rows="2" placeholder="Décrivez cet objectif..."></textarea>
      </div>

      <div class="field-group" *ngIf="!isEdit">
        <label class="field-label">Variables d'action (optionnel)</label>
        <textarea [(ngModel)]="actionVariablesText" class="field-input" rows="3"
          placeholder="Une action par ligne — ex:&#10;Préparer la revue mensuelle&#10;Mettre à jour le tableau KPI"></textarea>
        <p class="text-[11px] text-gray-400 mt-1">Chaque ligne devient une tâche récurrente dans le planning jusqu'à complétion.</p>
      </div>

      <!-- Couleur -->
      <div class="field-group">
        <label class="field-label">Couleur</label>
        <div class="color-picker">
          <button *ngFor="let c of colors"
            class="color-swatch"
            [style.background]="c"
            [class.color-selected]="form.color === c"
            (click)="form.color = c">
          </button>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" (click)="onCancel()">Annuler</button>
      <button class="btn-save" [style.background]="form.color" (click)="onSave()" [disabled]="!form.title">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        {{ isEdit ? "Enregistrer" : "Créer l'objectif" }}
      </button>
    </div>
  </div>
</div>
  `
})
export class GoalFormComponent implements OnInit {
  @Input() initialData: Partial<GoalCreate> | null = null;
  @Input() isEdit = false;
  @Output() save = new EventEmitter<GoalCreate>();
  @Output() cancel = new EventEmitter<void>();

  categories = CATEGORIES;
  colors = GOAL_COLORS;

  form: GoalCreate = {
    title: '',
    category: 'Général',
    annual_target: 365,
    year: new Date().getFullYear(),
    color: '#6366f1',
    description: ''
  };

  actionVariablesText = '';



  ngOnInit() {
    if (this.initialData) {
      this.form = { ...this.form, ...this.initialData };
    }
  }

  onSave() {
    if (!this.form.title) return;
    const payload: GoalCreate = { ...this.form };
    if (!this.isEdit && this.actionVariablesText.trim()) {
      payload.action_variables = this.actionVariablesText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
    }
    this.save.emit(payload);
  }

  onCancel() {
    this.cancel.emit();
  }
}
