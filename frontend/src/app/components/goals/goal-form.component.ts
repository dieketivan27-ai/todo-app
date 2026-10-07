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
      <h2>{{ isEdit ? 'Modifier' : 'Nouvel objectif' }}</h2>
      <button class="modal-close" (click)="onCancel()">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="modal-body">
      <div class="field-group">
        <label class="field-label">Titre de l'objectif *</label>
        <input [(ngModel)]="form.title" type="text" class="field-input" placeholder="Ex: Objectifs RH 2026" />
      </div>

      <div class="field-group">
        <label class="field-label">Catégorie</label>
        <select [(ngModel)]="form.category" class="field-input">
          <option value="Toutes">Toutes les catégories</option>
          <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Année</label>
        <input [(ngModel)]="form.year" type="number" min="2020" max="2035" class="field-input" />
      </div>

      <div class="field-group" *ngIf="!isEdit">
        <div class="flex items-center justify-between gap-2 mb-2">
          <label class="field-label mb-0">Actions / tâches liées *</label>
          <span class="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {{ filledActionsCount() }} renseignée(s)
          </span>
        </div>
        <p class="text-[11px] text-gray-500 mb-3">
          Une action = une tâche dans le planning (V1, V2…). Renseignez chaque ligne séparément.
        </p>

        <ul class="action-rows space-y-2 max-h-[220px] overflow-y-auto pr-1">
          <li *ngFor="let row of actionRows; let i = index; trackBy: trackByIndex"
            class="action-row flex items-center gap-2">
            <span class="action-badge">V{{ i + 1 }}</span>
            <input
              type="text"
              class="field-input flex-1 min-w-0 action-input"
              [(ngModel)]="actionRows[i]"
              [name]="'action-' + i"
              [placeholder]="actionPlaceholder(i)"
              (keydown.enter)="onActionEnter(i, $event)" />
            <button type="button"
              class="action-remove"
              (click)="removeActionRow(i)"
              [disabled]="actionRows.length <= 1"
              title="Supprimer cette ligne">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </li>
        </ul>

        <button type="button" class="add-action-btn" (click)="addActionRow()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Ajouter une action
        </button>
      </div>

      <p *ngIf="isEdit" class="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
        Les actions se gèrent sur la fiche objectif (liste avec cases à cocher).
      </p>

      <div class="field-group">
        <label class="field-label">Couleur</label>
        <div class="color-picker">
          <button *ngFor="let c of colors"
            type="button"
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
    .action-badge {
      flex-shrink: 0;
      width: 2rem;
      text-align: center;
      font-size: 10px;
      font-weight: 800;
      color: #6d28d9;
      background: #ede9fe;
      border-radius: 8px;
      padding: 6px 0;
    }
    .action-input { margin: 0; }
    .action-remove {
      flex-shrink: 0;
      padding: 8px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #9ca3af;
    }
    .action-remove:not(:disabled):hover { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
    .action-remove:disabled { opacity: 0.35; cursor: not-allowed; }
    .add-action-btn {
      margin-top: 10px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px;
      font-size: 12px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px dashed #c7d2fe;
      border-radius: 12px;
    }
    .add-action-btn:hover { background: #e0e7ff; }
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
    annual_target: 1,
    year: new Date().getFullYear(),
    color: '#6366f1'
  };

  /** Une entrée par action — pas de textarea multi-lignes pour éviter les mélanges. */
  actionRows: string[] = [''];

  ngOnInit() {
    if (this.initialData) {
      const { description: _d, action_variables, ...rest } = this.initialData;
      this.form = { ...this.form, ...rest };
      if (Array.isArray(action_variables) && action_variables.length) {
        this.actionRows = action_variables.map(v => (typeof v === 'string' ? v : v.title)).filter(Boolean);
        if (this.actionRows.length === 0) this.actionRows = [''];
      }
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  actionPlaceholder(index: number): string {
    const examples = [
      'Ex: Préparer la revue mensuelle',
      'Ex: Mettre à jour le tableau KPI',
      'Ex: Point équipe hebdomadaire'
    ];
    return examples[index % examples.length];
  }

  filledActionsCount(): number {
    return this.actionRows.filter(r => r.trim().length > 0).length;
  }

  addActionRow() {
    this.actionRows = [...this.actionRows, ''];
  }

  removeActionRow(index: number) {
    if (this.actionRows.length <= 1) return;
    this.actionRows = this.actionRows.filter((_, i) => i !== index);
  }

  onActionEnter(index: number, event: Event) {
    event.preventDefault();
    if (index === this.actionRows.length - 1) {
      this.addActionRow();
    }
  }

  canSave(): boolean {
    if (!this.form.title?.trim()) return false;
    if (!this.isEdit && this.filledActionsCount() === 0) return false;
    return true;
  }

  onSave() {
    if (!this.canSave()) return;
    const payload: GoalCreate = { ...this.form, goal_type: 'actions' };
    if (!this.isEdit) {
      payload.action_variables = this.actionRows.map(r => r.trim()).filter(Boolean);
    }
    this.save.emit(payload);
  }

  onCancel() {
    this.cancel.emit();
  }
}
