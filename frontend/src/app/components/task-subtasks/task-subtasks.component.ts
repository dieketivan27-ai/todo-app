import { Component, Input, Output, EventEmitter, OnInit, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubTask } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-subtasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="border border-gray-100 rounded-xl p-3 bg-gray-50/80">
      <div class="flex items-center justify-between gap-2 mb-2">
        <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">Sous-tâches</label>
        <span *ngIf="subtasks().length > 0" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {{ doneCount() }}/{{ subtasks().length }}
        </span>
      </div>

      <ul *ngIf="subtasks().length > 0" class="space-y-2 mb-3">
        <li *ngFor="let st of subtasks()" class="flex items-center gap-2 text-sm">
          <button type="button" (click)="toggle(st)" class="flex-shrink-0" [disabled]="!taskId || saving()">
            <span *ngIf="st.terminee" class="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </span>
            <span *ngIf="!st.terminee" class="w-5 h-5 rounded-md border-2 border-gray-300"></span>
          </button>
          <span class="flex-1 min-w-0 truncate" [class.line-through]="st.terminee" [class.text-gray-400]="st.terminee">{{ st.titre }}</span>
          <button type="button" (click)="remove(st)" [disabled]="!taskId || saving()" class="text-gray-400 hover:text-red-500 p-1" title="Supprimer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      </ul>

      <div *ngIf="showCompleteParentHint()" class="mb-3 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <span>Toutes les sous-tâches sont terminées.</span>
        <button type="button" (click)="completeParent.emit()" class="text-[10px] font-bold underline">Marquer la tâche principale terminée ?</button>
      </div>

      <div class="flex gap-2" *ngIf="taskId">
        <input [(ngModel)]="newTitle" type="text" placeholder="Nouvelle sous-tâche…"
          class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          (keyup.enter)="add()" />
        <button type="button" (click)="add()" [disabled]="!newTitle.trim() || saving()"
          class="text-xs font-bold text-white bg-[#3b28cc] px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
          + Ajouter
        </button>
      </div>
      <p *ngIf="!taskId" class="text-[11px] text-gray-400">Enregistrez la tâche pour ajouter des sous-tâches.</p>
    </div>
  `
})
export class TaskSubtasksComponent implements OnInit, OnChanges {
  @Input() taskId: number | null = null;
  @Input() parentStatus: string | null = null;
  @Input() initialSubtasks: SubTask[] | null = null;
  @Output() completeParent = new EventEmitter<void>();
  @Output() subtasksChange = new EventEmitter<SubTask[]>();

  private taskService = inject(TaskService);

  subtasks = signal<SubTask[]>([]);
  saving = signal(false);
  newTitle = '';

  ngOnInit() {
    this.syncFromInput();
  }

  ngOnChanges() {
    this.syncFromInput();
  }

  private syncFromInput() {
    if (this.initialSubtasks?.length) {
      this.subtasks.set([...this.initialSubtasks]);
    } else if (this.taskId) {
      this.load();
    }
  }

  doneCount() {
    return this.subtasks().filter(s => s.terminee).length;
  }

  showCompleteParentHint(): boolean {
    const list = this.subtasks();
    return list.length > 0
      && list.every(s => s.terminee)
      && this.parentStatus !== 'DONE';
  }

  load() {
    if (!this.taskId) return;
    this.taskService.getById(this.taskId).subscribe({
      next: t => {
        this.subtasks.set(t.subtasks || []);
        this.subtasksChange.emit(this.subtasks());
      }
    });
  }

  add() {
    const titre = this.newTitle.trim();
    if (!titre || !this.taskId) return;
    this.saving.set(true);
    this.taskService.createSubtask(this.taskId, titre).subscribe({
      next: st => {
        this.subtasks.update(list => [...list, st]);
        this.newTitle = '';
        this.saving.set(false);
        this.subtasksChange.emit(this.subtasks());
      },
      error: () => this.saving.set(false)
    });
  }

  toggle(st: SubTask) {
    if (!this.taskId) return;
    this.taskService.updateSubtask(this.taskId, st.id, { terminee: !st.terminee }).subscribe({
      next: updated => {
        this.subtasks.update(list => list.map(s => (s.id === updated.id ? updated : s)));
        this.subtasksChange.emit(this.subtasks());
      }
    });
  }

  remove(st: SubTask) {
    if (!this.taskId || !confirm('Supprimer cette sous-tâche ?')) return;
    this.taskService.deleteSubtask(this.taskId, st.id).subscribe({
      next: () => {
        this.subtasks.update(list => list.filter(s => s.id !== st.id));
        this.subtasksChange.emit(this.subtasks());
      }
    });
  }
}
