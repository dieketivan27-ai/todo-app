import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Task, TaskCreate, TaskUpdate, CATEGORIES } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 mb-1">Gestion des Tâches</h1>
          <p class="text-sm text-gray-500 font-medium">Tableau Kanban de vos tâches en cours.</p>
        </div>
        <button (click)="openModal()" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span class="hidden sm:inline">Nouvelle tâche</span>
        </button>
      </div>

      <!-- Search & Filters Bar -->
      <div class="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
        <div class="relative flex-1 w-full md:max-w-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()"
            class="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-all sm:text-sm font-medium"
            placeholder="Rechercher une tâche...">
        </div>
        <select [(ngModel)]="filterPriority" (ngModelChange)="applyFilters()"
          class="border border-gray-200 rounded-xl py-3 md:py-2 px-3 text-sm font-bold text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] w-full md:w-auto">
          <option value="">Toutes priorités</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Faible</option>
        </select>
        <div class="mt-2 md:mt-0 text-center md:ml-auto text-sm font-medium text-gray-500">{{ allTasks().length }} tâche(s)</div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="flex items-center justify-center py-16">
        <div class="flex items-center gap-3 text-gray-400">
          <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          Chargement...
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && allTasks().length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Aucune tâche pour l'instant</h3>
        <p class="text-gray-500 font-medium mb-6 max-w-sm">Créez votre première tâche pour commencer à organiser votre productivité.</p>
        <button (click)="openModal()" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Créer ma première tâche
        </button>
      </div>

      <!-- Kanban Board -->
      <div *ngIf="!loading() && allTasks().length > 0" class="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory pb-4">

        <!-- Column: À Faire -->
        <div class="flex flex-col gap-3 min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
          <div class="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
              <h3 class="font-bold text-gray-700">À Faire</h3>
            </div>
            <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">{{ todoTasks().length }}</span>
          </div>
          <div *ngFor="let task of todoTasks()" class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
            <ng-container *ngTemplateOutlet="taskCard; context: { task: task }"></ng-container>
          </div>
          <div *ngIf="todoTasks().length === 0" class="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400 font-medium">Aucune tâche</div>
        </div>

        <!-- Column: En Cours -->
        <div class="flex flex-col gap-3 min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
          <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 class="font-bold text-amber-900">En Cours</h3>
            </div>
            <span class="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">{{ inProgressTasks().length }}</span>
          </div>
          <div *ngFor="let task of inProgressTasks()" class="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
            <ng-container *ngTemplateOutlet="taskCard; context: { task: task }"></ng-container>
          </div>
          <div *ngIf="inProgressTasks().length === 0" class="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400 font-medium">Aucune tâche</div>
        </div>

        <!-- Column: Terminées -->
        <div class="flex flex-col gap-3 min-w-[85vw] sm:min-w-[400px] lg:min-w-0 snap-center">
          <div class="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 class="font-bold text-emerald-900">Terminées</h3>
            </div>
            <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">{{ doneTasks().length }}</span>
          </div>
          <div *ngFor="let task of doneTasks()" class="bg-gray-50 border border-gray-100 rounded-2xl p-4 opacity-80 group">
            <ng-container *ngTemplateOutlet="taskCard; context: { task: task }"></ng-container>
          </div>
          <div *ngIf="doneTasks().length === 0" class="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400 font-medium">Aucune tâche</div>
        </div>

      </div>

      <!-- Task Card Template -->
      <ng-template #taskCard let-task="task">
        <div class="flex items-start gap-3">
          <button (click)="toggleDone(task)"
            class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 transition-colors"
            [class]="task.status === 'DONE' ? 'bg-[#3b28cc] border-[#3b28cc] flex items-center justify-center' : 'border-gray-300 hover:border-[#3b28cc]'">
            <svg *ngIf="task.status === 'DONE'" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
          </button>
          <div class="flex-1 min-w-0">
            <h4 class="text-[15px] font-bold leading-tight mb-2" [class]="task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900'">{{ task.title }}</h4>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-gray-500">
              <span class="text-[#3b28cc]">{{ task.category }}</span>
              <span *ngIf="task.deadline" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ task.deadline | date:'d MMM' }}
              </span>
              <span [class]="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row lg:flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <button *ngIf="task.status !== 'IN_PROGRESS' && task.status !== 'DONE'" (click)="markInProgress(task)"
              class="text-amber-600 hover:bg-amber-50 p-1 rounded transition-colors" title="Démarrer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
            </button>
            <button (click)="openEditModal(task)" class="text-gray-400 hover:text-[#3b28cc] p-1 rounded transition-colors" title="Modifier">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <button (click)="deleteTask(task)" class="text-gray-400 hover:text-red-500 p-1 rounded transition-colors" title="Supprimer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </ng-template>

      <!-- Modal Create/Edit -->
      <div *ngIf="showModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative">
          <button (click)="closeModal()" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>

          <h2 class="text-xl font-extrabold text-gray-900 mb-6">{{ editingTask() ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Titre *</label>
              <input type="text" [(ngModel)]="form.title" placeholder="Ex: Corriger le bug d'auth"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-colors">
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Description</label>
              <textarea [(ngModel)]="form.description" rows="3" placeholder="Détails optionnels..."
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-colors resize-none"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Priorité</label>
                <select [(ngModel)]="form.priority"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                  <option value="HIGH">🔴 Haute</option>
                  <option value="MEDIUM">🟠 Moyenne</option>
                  <option value="LOW">🟢 Faible</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
                <select [(ngModel)]="form.category"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Date limite</label>
              <input type="date" [(ngModel)]="form.deadline"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-colors">
            </div>
          </div>

          <div *ngIf="formError()" class="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{{ formError() }}</div>

          <div class="flex gap-3 mt-6">
            <button (click)="closeModal()" class="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
            <button (click)="saveTask()" [disabled]="saving()"
              class="flex-1 py-3 bg-[#3b28cc] hover:bg-[#3222b0] text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <svg *ngIf="saving()" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              {{ editingTask() ? 'Sauvegarder' : 'Créer la tâche' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);

  allTasks = signal<Task[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingTask = signal<Task | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);

  searchTerm = '';
  filterPriority = '';

  categories = CATEGORIES;

  form: TaskCreate = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'Général',
    deadline: ''
  };

  ngOnInit() { 
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      this.loadTasks(); 
    });
  }

  loadTasks() {
    this.loading.set(true);
    const params: any = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.filterPriority) params.priority = this.filterPriority;
    
    this.taskService.getAll(params).subscribe({
      next: (tasks) => { this.allTasks.set(tasks); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  applyFilters() {
    this.loadTasks();
  }

  todoTasks() { return this.allTasks().filter(t => t.status === 'TODO' || t.status === 'LATE'); }
  inProgressTasks() { return this.allTasks().filter(t => t.status === 'IN_PROGRESS'); }
  doneTasks() { return this.allTasks().filter(t => t.status === 'DONE'); }

  getPriorityLabel(p: string) {
    const m: Record<string, string> = { HIGH: '🔴 Haute', MEDIUM: '🟠 Moyenne', LOW: '🟢 Faible' };
    return m[p] || p;
  }
  getPriorityClass(p: string) {
    const m: Record<string, string> = {
      HIGH: 'text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100',
      MEDIUM: 'text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100',
      LOW: 'text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100'
    };
    return m[p] || '';
  }

  openModal() {
    this.editingTask.set(null);
    this.form = { title: '', description: '', priority: 'MEDIUM', category: 'Général', deadline: '' };
    this.formError.set(null);
    this.showModal.set(true);
  }
  openEditModal(task: Task) {
    this.editingTask.set(task);
    this.form = { title: task.title, description: task.description || '', priority: task.priority, category: task.category, deadline: task.deadline || '' };
    this.formError.set(null);
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); this.editingTask.set(null); }

  saveTask() {
    if (!this.form.title.trim()) { this.formError.set('Le titre est requis.'); return; }
    this.saving.set(true);
    this.formError.set(null);
    const editing = this.editingTask();
    const obs = editing
      ? this.taskService.update(editing.id, this.form)
      : this.taskService.create(this.form);
    obs.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadTasks(); },
      error: () => { this.saving.set(false); this.formError.set('Une erreur est survenue.'); }
    });
  }

  toggleDone(task: Task) {
    if (task.status === 'DONE') {
      this.taskService.update(task.id, { status: 'TODO' }).subscribe({ next: () => this.loadTasks() });
    } else {
      this.taskService.markDone(task.id).subscribe({ next: () => this.loadTasks() });
    }
  }

  markInProgress(task: Task) {
    this.taskService.markInProgress(task.id).subscribe({ next: () => this.loadTasks() });
  }

  deleteTask(task: Task) {
    if (!confirm('Supprimer cette tâche ?')) return;
    this.taskService.delete(task.id).subscribe({ next: () => this.loadTasks() });
  }
}
