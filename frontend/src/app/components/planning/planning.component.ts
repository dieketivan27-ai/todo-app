import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlanningSlot } from '../../models/task.model';
import { PlanningService } from '../../services/planning.service';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- En-tÃªte -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 mb-1">Planning &amp; Time-blocking</h1>
          <p class="text-sm text-gray-500 font-medium">File progressive : une tÃ¢che Ã  la fois, sous-tÃ¢che aprÃ¨s sous-tÃ¢che.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button (click)="goToToday()" *ngIf="weekOffset() !== 0" class="text-sm font-bold text-[#3b28cc] hover:underline transition-all">
            Aujourd'hui
          </button>
          <button (click)="prevWeek()" class="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm whitespace-nowrap">S{{ weekNum() }} â€¢ {{ weekRange() }}</span>
          <button (click)="nextWeek()" class="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Calendrier jour -->
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div class="flex lg:grid lg:grid-cols-7 overflow-x-auto snap-x snap-mandatory scrollbar-none">
          <div *ngFor="let day of weekDays(); let i = index"
            class="flex-shrink-0 w-[calc(100%/3.5)] min-w-[90px] sm:w-auto sm:min-w-0 lg:w-auto p-3 md:p-4 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors snap-start"
            [class]="i === selectedDay() ? 'bg-[#3b28cc] text-white' : 'hover:bg-gray-50'"
            (click)="selectedDay.set(i)">
            <p class="text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-1 truncate" [class]="i === selectedDay() ? 'text-indigo-200' : 'text-gray-400'">{{ day.label }}</p>
            <p class="text-xl md:text-2xl font-extrabold">{{ day.num }}</p>
            <p class="text-[10px] md:text-[11px] font-semibold mt-1" [class]="i === selectedDay() ? 'text-indigo-200' : 'text-gray-400'">
              {{ getTasksForDay(i).length }} crÃ©n.
            </p>
          </div>
        </div>
      </div>

      <!-- Liste des blocs du jour -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div class="flex items-center gap-2 text-sm font-bold text-gray-700 min-w-0">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="truncate">Blocs pour {{ weekDays()[selectedDay()].label }} {{ weekDays()[selectedDay()].num }} {{ currentMonth() }}</span>
          </div>
          <div class="bg-[#3b28cc]/10 text-[#3b28cc] text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
            {{ getTotalFocusHours() }}h 00m Total Focus
          </div>
        </div>

        <div *ngIf="loading()" class="text-center py-8 text-gray-400 text-sm">Chargement du planningâ€¦</div>

        <div *ngIf="!loading() && displayTasks().length === 0" class="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div class="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Aucun bloc programmÃ©</h3>
          <p class="text-gray-500 font-medium mb-5 max-w-sm mx-auto">Ajoutez des variables d'action Ã  un objectif ou crÃ©ez des tÃ¢ches avec une Ã©chÃ©ance cette semaine.</p>
          <a routerLink="/goals" class="inline-flex items-center gap-2 bg-[#3b28cc] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#3222b0] transition-colors">
            Voir les objectifs
          </a>
        </div>

        <div *ngIf="!loading() && displayTasks().length > 0" class="space-y-3">
          <div *ngFor="let task of displayTasks()"
            class="bg-white border rounded-2xl shadow-sm overflow-hidden"
            [ngClass]="taskRowClasses(task)">

            <!-- Ligne principale -->
            <div class="p-3 md:p-4 flex items-start gap-3 md:gap-4">
              <div class="flex-shrink-0 text-center min-w-[70px] md:min-w-[90px]">
                <span class="text-xs font-extrabold text-gray-700 bg-gray-100 px-2 md:px-3 py-1.5 rounded-lg block">
                  {{ task.start_time || 'â€”' }}
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-900 text-sm break-words line-clamp-2"
                  [class.line-through]="task.status === 'DONE' || task.is_completed_occurrence"
                  [class.text-gray-500]="task.status === 'DONE' || task.is_completed_occurrence">{{ task.title }}</h4>

                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                  <span class="text-[10px] font-bold text-[#3b28cc] bg-indigo-50 px-1.5 py-0.5 rounded">{{ task.category }}</span>

                  <!-- Badge Objectif -->
                  <span *ngIf="task.is_action_variable"
                    class="text-[10px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded cursor-help"
                    [title]="'Objectif : ' + (task.goal_title || 'â€”')">
                    Objectif â€¢ V{{ task.action_index ?? '?' }}
                  </span>

                  <!-- Badge queue_state -->
                  <span *ngIf="task.queue_state === 'active'"
                    class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    â–¶ Active
                  </span>
                  <span *ngIf="task.queue_state === 'upcoming'"
                    class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Ã€ venir
                  </span>
                  <span *ngIf="task.queue_state === 'overdue' || (task.is_overdue && task.status !== 'DONE')"
                    class="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    En retard
                  </span>

                  <!-- Deadline classique -->
                  <span *ngIf="task.task_deadline && !task.is_action_variable && task.status !== 'DONE'"
                    class="text-[10px] font-bold text-gray-500 hidden sm:inline">
                    limite {{ task.task_deadline }}
                  </span>
                  <span *ngIf="!task.is_action_variable && !task.is_overdue" class="text-[10px] font-bold text-gray-400 hidden sm:inline">â€¢ DEEP WORK</span>
                </div>

                <p *ngIf="task.is_action_variable && task.goal_title" class="text-[10px] text-violet-600 mt-1 truncate">
                  {{ task.goal_title }}
                </p>
              </div>

              <!-- Actions -->
              <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                <!-- Bouton Terminer : variable active sans sous-tÃ¢ches, ou tÃ¢che classique non terminÃ©e -->
                <button
                  *ngIf="task.status !== 'DONE' && canShowCompleteButton(task)"
                  type="button"
                  (click)="markActionDone(task)"
                  [disabled]="completingId() === task.id"
                  class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                  Terminer
                </button>

                <span *ngIf="task.status === 'DONE'"
                  class="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  âœ“ ComplÃ©tÃ©
                </span>
                <span *ngIf="task.status === 'IN_PROGRESS' && task.queue_state !== 'active'"
                  class="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  En cours
                </span>
                <span *ngIf="(task.status === 'TODO' || task.status === 'LATE') && !task.is_action_variable"
                  class="hidden sm:flex items-center gap-1.5 bg-indigo-50 text-[#3b28cc] border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                  PrÃ©vu
                </span>
              </div>
            </div>

            <!-- Checklist des sous-tÃ¢ches -->
            <div *ngIf="task.subtasks && task.subtasks.length > 0"
              class="border-t px-4 py-3 space-y-2"
              [class.border-violet-100]="task.is_action_variable && task.queue_state === 'active'"
              [class.border-gray-100]="!task.is_action_variable || task.queue_state !== 'active'">

              <div *ngFor="let st of task.subtasks"
                class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors min-h-[44px]"
                [class.bg-violet-50]="task.is_action_variable && st.id === task.current_subtask_id"
                [class.opacity-40]="task.is_action_variable && task.queue_state === 'upcoming'"
                [class.cursor-not-allowed]="task.is_action_variable && (task.queue_state !== 'active' || (st.id !== task.current_subtask_id && !st.terminee))">

                <!-- Case Ã  cocher -->
                <input
                  type="checkbox"
                  [id]="'st-' + st.id"
                  [checked]="st.terminee"
                  [disabled]="(task.is_action_variable && task.queue_state !== 'active') || togglingSubtaskId() === st.id || (task.is_action_variable && st.id !== task.current_subtask_id && !st.terminee)"
                  (change)="toggleSubtask(task, st.id, !st.terminee)"
                  class="w-5 h-5 md:w-4 md:h-4 accent-violet-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0">

                <label
                  [for]="'st-' + st.id"
                  class="text-sm md:text-xs font-medium flex-1 cursor-pointer select-none py-2"
                  [class.line-through]="st.terminee"
                  [class.text-gray-400]="st.terminee"
                  [class.text-gray-700]="!st.terminee && (!task.is_action_variable || st.id !== task.current_subtask_id)"
                  [class.text-violet-800]="task.is_action_variable && st.id === task.current_subtask_id && !st.terminee"
                  [class.font-bold]="task.is_action_variable && st.id === task.current_subtask_id && !st.terminee">
                  {{ st.titre }}
                </label>

                <!-- Indicateur "en cours" (uniquement variables d'action) -->
                <span *ngIf="task.is_action_variable && st.id === task.current_subtask_id && !st.terminee"
                  class="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  En cours
                </span>
              </div>
            </div>

          </div><!-- /card -->
        </div>
      </div>

    </div>
  `
})
export class PlanningComponent implements OnInit {
  private planningService = inject(PlanningService);
  private taskService = inject(TaskService);

  slots = signal<PlanningSlot[]>([]);
  loading = signal(false);
  completingId = signal<number | null>(null);
  togglingSubtaskId = signal<number | null>(null);

  weekOffset = signal(0);
  selectedDay = signal(0);

  weekDays = signal<{ label: string; num: number; date: Date; dateKey: string }[]>([]);
  weekNum = signal(0);
  weekRange = signal('');
  currentMonth = signal('');

  constructor() {
    this.computeWeek(0);
  }

  ngOnInit() {
    this.loadWeek();
  }

  private loadWeek() {
    const day = this.weekDays()[0];
    if (!day) return;
    const dateKey = day.dateKey;
    this.loading.set(true);
    this.planningService.getWeek(dateKey).subscribe({
      next: data => {
        this.slots.set(data.slots);
        if (data.week?.number) this.weekNum.set(data.week.number);
        this.loading.set(false);
      },
      error: () => {
        this.slots.set([]);
        this.loading.set(false);
      }
    });
  }

  computeWeek(offset: number) {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7));

    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const labels = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ label: labels[i], num: d.getDate(), date: d, dateKey });
    }
    this.weekDays.set(days);

    if (offset === 0) {
      const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      this.selectedDay.set(todayIndex);
    } else {
      this.selectedDay.set(0);
    }

    const target = new Date(today.valueOf());
    const dayNr = (today.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    this.weekNum.set(1 + Math.ceil((firstThursday - target.valueOf()) / 604800000));

    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    this.weekRange.set(`${monday.getDate()} â€“ ${sun.getDate()} ${sun.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
    this.currentMonth.set(today.toLocaleDateString('fr-FR', { month: 'long' }));
  }

  prevWeek() {
    this.weekOffset.update(v => v - 1);
    this.computeWeek(this.weekOffset());
    this.loadWeek();
  }

  nextWeek() {
    this.weekOffset.update(v => v + 1);
    this.computeWeek(this.weekOffset());
    this.loadWeek();
  }

  goToToday() {
    this.weekOffset.set(0);
    this.computeWeek(0);
    this.loadWeek();
  }

  getTasksForDay(dayIndex: number): PlanningSlot[] {
    const day = this.weekDays()[dayIndex];
    if (!day) return [];
    return this.slots().filter(s => s.deadline === day.dateKey);
  }

  displayTasks = computed(() => {
    const dayIndex = this.selectedDay();
    const day = this.weekDays()[dayIndex];
    if (!day) return [];
    return this.slots().filter(s => s.deadline === day.dateKey);
  });

  getTotalFocusHours(): number {
    return Math.max(0, Math.ceil(this.displayTasks().length * 1.5));
  }

  /**
   * Affiche le bouton "Terminer" uniquement pour :
   *  - une variable active sans sous-tÃ¢ches
   *  - une tÃ¢che classique (pas is_action_variable)
   */
  canShowCompleteButton(task: PlanningSlot): boolean {
    if (!task.is_action_variable) return true;
    // Variable active sans sous-tÃ¢ches
    if (task.queue_state === 'active' && (!task.subtasks || task.subtasks.length === 0)) return true;
    return false;
  }

  taskRowClasses(task: PlanningSlot): Record<string, boolean> {
    const action  = !!task.is_action_variable;
    const overdue = (task.queue_state === 'overdue') || (!!task.is_overdue && task.status !== 'DONE');
    const done    = task.status === 'DONE' || !!task.is_completed_occurrence;
    const upcoming = task.queue_state === 'upcoming';
    return {
      'border-violet-200 bg-violet-50/40': action && !overdue && !done && !upcoming,
      'border-gray-200 bg-gray-50/60 opacity-70': upcoming,
      'border-red-300 bg-red-50/50': overdue,
      'border-emerald-200 bg-emerald-50/30': done,
      'border-amber-200': !action && !done && !overdue && task.status === 'IN_PROGRESS',
      'border-gray-100': !action && !done && !overdue && (task.status === 'TODO' || task.status === 'LATE')
    };
  }

  markActionDone(task: PlanningSlot) {
    this.completingId.set(task.id);
    this.taskService.markDone(task.id).subscribe({
      next: () => {
        this.completingId.set(null);
        this.loadWeek();
      },
      error: () => this.completingId.set(null)
    });
  }

  toggleSubtask(task: PlanningSlot, subtaskId: number, terminee: boolean) {
    this.togglingSubtaskId.set(subtaskId);
    this.taskService.updateSubtask(task.id, subtaskId, { terminee }).subscribe({
      next: () => {
        this.togglingSubtaskId.set(null);
        this.loadWeek();
      },
      error: () => this.togglingSubtaskId.set(null)
    });
  }
}
