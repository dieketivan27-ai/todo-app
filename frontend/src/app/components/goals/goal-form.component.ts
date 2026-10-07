import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalCreate, GoalType, CATEGORIES, GOAL_COLORS } from '../../models/task.model';

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



      <!-- Type d'objectif -->
      <div class="field-group" *ngIf="!isEdit">
        <label class="field-label">Type d'objectif</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" class="goal-type-card" [class.goal-type-selected]="goalType === 'actions'" (click)="goalType = 'actions'">
            <span class="goal-type-title">Par actions</span>
            <span class="goal-type-desc">Tâches liées (V1, V2…) récurrentes dans le planning jusqu'à complétion.</span>
          </button>
          <button type="button" class="goal-type-card" [class.goal-type-selected]="goalType === 'habit'" (click)="goalType = 'habit'">
            <span class="goal-type-title">Annuel (habitudes)</span>
            <span class="goal-type-desc">Compteur annuel + étapes hebdomadaires Lun–Ven générées automatiquement.</span>
          </button>
        </div>
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

      <div class="field-group" *ngIf="!isEdit && goalType === 'actions'">
        <label class="field-label">Actions / tâches liées *</label>
        <textarea [(ngModel)]="actionVariablesText" class="field-input" rows="4"
          placeholder="Une action par ligne — ex:&#10;Préparer la revue mensuelle&#10;Mettre à jour le tableau KPI"></textarea>
        <p class="text-[11px] text-gray-400 mt-1">Chaque ligne crée une tâche (variable d'action) liée à cet objectif.</p>
      </div>

      <div class="field-group" *ngIf="!isEdit && goalType === 'habit'">
        <label class="field-label">Variables d'action (optionnel)</label>
        <textarea [(ngModel)]="actionVariablesText" class="field-input" rows="2"
          placeholder="En plus des étapes hebdo, ajouter des actions récurrentes…"></textarea>
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
      <button class="btn-save" [style.background]="form.color" (click)="onSave()" [disabled]="!canSave()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        {{ isEdit ? "Enregistrer" : "Créer l'objectif" }}
      </button>
    </div>
  </div>
</div>
  `,
  styles: [`
    .goal-type-card {
      text-align: left;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px;
      background: #fff;
      transition: border-color 0.15s, background 0.15s;
    }
    .goal-type-card:hover { border-color: #c7d2fe; }
    .goal-type-selected {
      border-color: #6366f1;
      background: #eef2ff;
    }
    .goal-type-title { display: block; font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .goal-type-desc { display: block; font-size: 11px; color: #6b7280; line-height: 1.35; }
  `]
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
  goalType: GoalType = 'actions';

  ngOnInit() {
    if (this.initialData) {
      this.form = { ...this.form, ...this.initialData };
    }
  }

  canSave(): boolean {
    if (!this.form.title) return false;
    if (!this.isEdit && this.goalType === 'actions') {
      return this.actionVariablesText.trim().length > 0;
    }
    return true;
  }

  onSave() {
    if (!this.canSave()) return;
    const payload: GoalCreate = { ...this.form };
    if (!this.isEdit) {
      payload.goal_type = this.goalType;
      if (this.actionVariablesText.trim()) {
        payload.action_variables = this.actionVariablesText
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
      }
    }
    this.save.emit(payload);
  }

  onCancel() {
    this.cancel.emit();
  }
}
