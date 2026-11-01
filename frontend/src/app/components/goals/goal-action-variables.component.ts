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

      <ul class="space-y-2 mb-3 min-w-0 max-w-full" *ngIf="variables().length > 0">
        <li *ngFor="let v of variables()"
          class="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 min-w-0 max-w-full">
          <button type="button" (click)="toggleDone(v)" class="flex-shrink-0 shrink-0"
            [title]="v.status === 'DONE' ? 'Marquer à faire' : 'Marquer terminée'">
            <span *ngIf="v.status === 'DONE'" class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </span>
            <span *ngIf="v.status !== 'DONE'" class="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0"></span>
          </button>
          <span class="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">V{{ v.action_index || '?' }}</span>
          <span class="flex-1 min-w-0 max-w-full break-all [overflow-wrap:anywhere] whitespace-pre-wrap line-clamp-3" [class.line-through]="v.status === 'DONE'" [class.text-gray-400]="v.status === 'DONE'" [title]="v.title">{{ v.title }}</span>
          <button type="button" (click)="remove(v)" class="text-gray-400 hover:text-red-500 p-1 flex-shrink-0 shrink-0" title="Supprimer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      </ul>

      <p *ngIf="variables().length === 0" class="text-xs text-gray-400 mb-3">Aucune variable d'action — elles apparaîtront dans le planning chaque semaine jusqu'à complétion.</p>

      <div class="flex flex-col gap-1 min-w-0 max-w-full">
        <div class="flex items-start gap-2 min-w-0 max-w-full">
          <textarea [(ngModel)]="newTitle" placeholder="Nouvelle variable (ex: Relire le chapitre 3)"
            class="flex-1 min-w-0 max-w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-y break-all [overflow-wrap:anywhere]" rows="1"
            [maxlength]="1000"
            (keydown.enter)="onNewTitleEnter($event)"
            (input)="autoResizeNew($event)"
            style="overflow:hidden;resize:vertical;min-height:38px"></textarea>
          <button type="button" (click)="add()" [disabled]="!newTitle.trim() || saving()"
            class="text-sm font-bold bg-[#3b28cc] text-white px-3 py-2 rounded-xl disabled:opacity-50 flex-shrink-0 shrink-0">
            Ajouter
          </button>
        </div>
        <span class="text-[10px] text-gray-400 text-right pr-1">{{ (newTitle || '').length }} / 1000</span>
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

  onNewTitleEnter(event: Event) {
    event.preventDefault();
    this.add();
  }

  autoResizeNew(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
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
