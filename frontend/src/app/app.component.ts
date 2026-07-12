import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { Task, TaskCreate, TaskUpdate, TaskStats, TaskFilters } from './models/task.model';
import { TaskService } from './services/task.service';

import { HeaderComponent } from './components/header/header.component';
import { StatsComponent } from './components/stats/stats.component';
import { FiltersComponent } from './components/filters/filters.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { GoalsDashboardComponent } from './components/goals/goals-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    HeaderComponent,
    StatsComponent,
    FiltersComponent,
    TaskListComponent,
    TaskFormComponent,
    GoalsDashboardComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private taskService = inject(TaskService);

  tasks = signal<Task[]>([]);
  stats = signal<TaskStats | null>(null);
  loading = signal(false);
  showForm = signal(false);
  editingTask = signal<Task | null>(null);
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');

  activeTab = signal<'tasks' | 'goals'>('tasks');

  private currentFilters: Partial<TaskFilters> = {};

  ngOnInit() {
    this.loadTasks();
    this.loadStats();
  }

  loadTasks(filters?: Partial<TaskFilters>) {
    this.loading.set(true);
    this.taskService.getAll(filters).subscribe({
      next: tasks => { this.tasks.set(tasks); this.loading.set(false); },
      error: err => { this.showToast('Erreur de chargement: ' + err.message, 'error'); this.loading.set(false); }
    });
  }

  loadStats() {
    this.taskService.getStats().subscribe({
      next: stats => this.stats.set(stats),
      error: () => {}
    });
  }

  onFiltersChange(filters: Partial<TaskFilters>) {
    this.currentFilters = filters;
    this.loadTasks(filters);
  }

  openCreateForm() {
    this.editingTask.set(null);
    this.showForm.set(true);
  }

  openEditForm(task: Task) {
    this.editingTask.set(task);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingTask.set(null);
  }

  onSave(data: TaskCreate | TaskUpdate) {
    const editing = this.editingTask();
    if (editing) {
      this.taskService.update(editing.id, data as TaskUpdate).subscribe({
        next: () => { this.closeForm(); this.refresh(); this.showToast('Tâche mise à jour ✓'); },
        error: err => this.showToast('Erreur: ' + err.message, 'error')
      });
    } else {
      this.taskService.create(data as TaskCreate).subscribe({
        next: () => { this.closeForm(); this.refresh(); this.showToast('Tâche créée ✓'); },
        error: err => this.showToast('Erreur: ' + err.message, 'error')
      });
    }
  }

  onDelete(id: number) {
    if (!confirm('Supprimer cette tâche ?')) return;
    this.taskService.delete(id).subscribe({
      next: () => { this.refresh(); this.showToast('Tâche supprimée'); },
      error: err => this.showToast('Erreur: ' + err.message, 'error')
    });
  }

  onMarkDone(id: number) {
    this.taskService.markDone(id).subscribe({
      next: () => { this.refresh(); this.showToast('Tâche terminée ✓'); },
      error: err => this.showToast('Erreur: ' + err.message, 'error')
    });
  }

  onMarkInProgress(id: number) {
    this.taskService.markInProgress(id).subscribe({
      next: () => { this.refresh(); this.showToast('Tâche en cours'); },
      error: err => this.showToast('Erreur: ' + err.message, 'error')
    });
  }

  private refresh() {
    this.loadTasks(this.currentFilters);
    this.loadStats();
  }

  private toastTimeout: any;
  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 3000);
  }
}
