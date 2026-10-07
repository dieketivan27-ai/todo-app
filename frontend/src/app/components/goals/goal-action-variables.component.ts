import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../../services/goal.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-goal-action-variables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mt-4 border-t border-gray-100 pt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-bold uppercase tracking-wide text-gray-500">Variables d'action</h4>
        <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {{ doneCount() }}/{{ variables().length }} terminées
        </span>
      </div>

      <ul class="space-y-2 mb-3" *ngIf="variables().length > 0">
        <li *ngFor="let v of variables()"
          class="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <button type="button" (click)="toggleDone(v)" class="flex-shrink-0"
            [title]="v.status === 'DONE' ? 'Marquer à faire' : 'Marquer terminée'">
            <span *ngIf="v.status === 'DONE'" class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </span>
            <span *ngIf="v.status !== 'DONE'" class="w-5 h-5 rounded-full border-2 border-gray-300"></span>
          </button>
          <span class="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">V{{ v.action_index || '?' }}</span>
          <span class="flex-1 min-w-0 truncate" [class.line-through]="v.status === 'DONE'" [class.text-gray-400]="v.status === 'DONE'">{{ v.title }}</span>
          <button type="button" (click)="remove(v)" class="text-gray-400 hover:text-red-500 p-1" title="Supprimer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      </ul>

      <p *ngIf="variables().length === 0" class="text-xs text-gray-400 mb-3">Aucune variable d'action — elles apparaîtront dans le planning chaque semaine jusqu'à complétion.</p>

      <div class="flex gap-2">
        <input [(ngModel)]="newTitle" type="text" placeholder="Nouvelle variable (ex: Relire le chapitre 3)"
          class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2" (keyup.enter)="add()" />
        <button type="button" (click)="add()" [disabled]="!newTitle.trim() || saving()"
          class="text-sm font-bold bg-[#3b28cc] text-white px-3 py-2 rounded-xl disabled:opacity-50">
          Ajouter
        </button>
      </div>
    </div>
  `
})
export class GoalActionVariablesComponent implements OnInit {
  @Input({ required: true }) goalId!: number;

  private goalService = inject(GoalService);
  private taskService = inject(TaskService);

  variables = signal<Task[]>([]);
  saving = signal(false);
  newTitle = '';

  ngOnInit() {
    this.load();
  }

  doneCount() {
    return this.variables().filter(v => v.status === 'DONE').length;
  }

  load() {
    this.goalService.getActionVariables(this.goalId).subscribe({
      next: list => this.variables.set(list),
      error: () => this.variables.set([])
    });
  }

  add() {
    const title = this.newTitle.trim();
    if (!title) return;
    this.saving.set(true);
    this.goalService.createActionVariable(this.goalId, { title }).subscribe({
      next: () => {
        this.newTitle = '';
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false)
    });
  }

  toggleDone(v: Task) {
    if (v.status === 'DONE') {
      this.taskService.update(v.id, { status: 'TODO' }).subscribe({ next: () => this.load() });
    } else {
      this.taskService.markDone(v.id).subscribe({ next: () => this.load() });
    }
  }

  remove(v: Task) {
    if (!confirm('Supprimer cette variable d\'action ?')) return;
    this.goalService.deleteActionVariable(this.goalId, v.id).subscribe({ next: () => this.load() });
  }
}
