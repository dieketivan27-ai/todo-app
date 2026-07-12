import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoalStep, Task } from '../../models/task.model';
import { GoalService } from '../../services/goal.service';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-goal-steps',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="steps-container mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Étapes de l'objectif</h4>
        <button (click)="loadSteps()" class="text-xs text-primary-500 hover:underline">Rafraîchir</button>
      </div>

      <div *ngIf="loading()" class="text-center py-4 text-xs text-gray-500">
        Chargement des étapes...
      </div>

      <div *ngIf="!loading() && steps().length === 0" class="text-center py-4 text-xs text-gray-500">
        Aucune étape hebdomadaire générée.
      </div>

      <div *ngIf="!loading() && steps().length > 0" class="space-y-3">
        <div *ngFor="let step of steps()" class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
          <!-- Step Header -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-gray-800 dark:text-gray-200">Semaine {{ step.week_number }}</span>
              <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-2">({{ step.week_start | date:'dd/MM' }} au {{ step.week_end | date:'dd/MM' }})</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
              [class.bg-emerald-100]="step.status === 'DONE'" [class.text-emerald-700]="step.status === 'DONE'"
              [class.bg-blue-100]="step.status === 'IN_PROGRESS'" [class.text-blue-700]="step.status === 'IN_PROGRESS'"
              [class.bg-gray-100]="step.status === 'PENDING'" [class.text-gray-600]="step.status === 'PENDING'">
              {{ step.status === 'DONE' ? 'Terminé' : step.status === 'IN_PROGRESS' ? 'En cours' : 'En attente' }}
            </span>
          </div>

          <!-- Progress Indicators Grid -->
          <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div class="bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
              <span class="block text-gray-400 dark:text-gray-500">Semaine</span>
              <span class="font-bold text-gray-800 dark:text-gray-200">{{ step.weeklyPct }}%</span>
            </div>
            <div class="bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
              <span class="block text-gray-400 dark:text-gray-500">Mois</span>
              <span class="font-bold text-gray-800 dark:text-gray-200">{{ step.monthlyPct }}%</span>
            </div>
            <div class="bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
              <span class="block text-gray-400 dark:text-gray-500">Évolution</span>
              <span class="font-bold" [class.text-emerald-500]="step.evolutionRate >= 85" [class.text-red-500]="step.evolutionRate < 85">
                {{ step.evolutionRate }}%
              </span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div class="bg-primary-500 h-full transition-all duration-300" [style.width.%]="step.weeklyPct"></div>
          </div>

          <!-- Daily Tasks List -->
          <div class="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-700/50">
            <div *ngFor="let task of step.dailyTasks" class="flex items-center justify-between text-xs py-1">
              <div class="flex items-center gap-2">
                <input type="checkbox" [checked]="task.status === 'DONE'" (change)="toggleTask(task)"
                  class="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span [class.line-through]="task.status === 'DONE'" [class.text-gray-400]="task.status === 'DONE'" class="text-gray-700 dark:text-gray-300">
                  {{ task.title }}
                </span>
              </div>
              <span class="text-[9px] text-gray-400 dark:text-gray-500">{{ task.deadline | date:'dd/MM' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class GoalStepsComponent implements OnInit {
  @Input() goalId!: number;

  private goalService = inject(GoalService);
  private taskService = inject(TaskService);

  steps = signal<GoalStep[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadSteps();
  }

  loadSteps() {
    this.loading.set(true);
    this.goalService.getSteps(this.goalId).subscribe({
      next: data => {
        this.steps.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleTask(task: Task) {
    if (task.status === 'DONE') {
      this.taskService.markInProgress(task.id).subscribe({
        next: () => this.loadSteps()
      });
    } else {
      this.taskService.markDone(task.id).subscribe({
        next: () => this.loadSteps()
      });
    }
  }
}
