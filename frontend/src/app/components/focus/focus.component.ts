import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Task, Goal } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { GoalService } from '../../services/goal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-focus',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">

      <!-- Alignement quotidien banner -->
      <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 14.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 8.123a.75.75 0 01.416-1.28l4.21-.611L9.327 2.418A.75.75 0 0110 2z"/></svg>
          Alignement Quotidien • {{ today }}
        </div>
        <h2 class="text-2xl font-extrabold text-gray-900 mb-2">« Concentre-toi sur l'essentiel aujourd'hui. »</h2>
        <p class="text-gray-500 text-sm font-medium italic mb-5">« L'alignement stratégique garantit que chaque minute passée te rapproche directement de la vision annuelle. »</p>
        <div class="flex items-center gap-6">
          <div class="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 text-center">
            <div class="text-xl font-extrabold text-[#3b28cc]">{{ totalFocusTime() }}h</div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Temps Focus Prévu</div>
          </div>
          <div class="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3 text-center">
            <div class="text-xl font-extrabold text-emerald-600">{{ alignedTasks().length }}/{{ allTasks().length }}</div>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">Tâches Alignées</div>
          </div>
        </div>
      </div>

      <!-- North Star Objectif Principal -->
      <div *ngIf="northStar()" class="bg-gradient-to-r from-[#3b28cc]/5 to-[#8b5cf6]/5 border-2 border-[#3b28cc]/20 rounded-2xl p-6">
        <div class="flex items-center gap-2 text-xs font-bold text-[#3b28cc] uppercase tracking-wider mb-3">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
          Objectif Principal du Jour (North Star)
        </div>
        <div class="flex items-center justify-between gap-6">
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-extrabold text-gray-900 mb-1 truncate">{{ northStar()!.title }}</h3>
            <p class="text-xs text-gray-500 font-medium">Rattaché à l'Horizon {{ northStar()!.year }}</p>
          </div>
          <div class="flex-shrink-0 flex items-center gap-4">
            <div class="text-right">
              <div class="text-2xl font-extrabold text-[#3b28cc]">{{ northStar()!.stats.annualPct }}%</div>
              <div class="text-[10px] font-bold text-gray-500 uppercase">atteint</div>
            </div>
            <a routerLink="/goals" class="bg-[#3b28cc] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#3222b0] transition-colors whitespace-nowrap flex items-center gap-1.5">
              Voir impact cascade
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
        <div class="mt-4 w-full bg-white rounded-full h-3 border border-[#3b28cc]/10">
          <div class="bg-[#3b28cc] h-3 rounded-full transition-all" [style.width]="northStar()!.stats.annualPct + '%'"></div>
        </div>
      </div>

      <!-- No goal state -->
      <div *ngIf="!northStar() && !loading()" class="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center">
        <div class="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h3 class="font-bold text-gray-900 mb-2">Définissez votre North Star</h3>
        <p class="text-sm text-gray-500 mb-4">Créez votre premier objectif annuel pour activer l'alignement stratégique.</p>
        <a routerLink="/goals" class="inline-flex items-center gap-2 bg-[#3b28cc] text-white px-5 py-2.5 rounded-xl text-sm font-bold">✨ Créer un objectif</a>
      </div>

      <!-- Priorités du matin (Deep Work) -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            Priorités du matin (Deep Work)
            <span class="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-blue-100">{{ inProgressTasks().length + todoTasks().length }} créneaux</span>
          </h2>
          <span class="text-xs text-gray-500 font-medium">08:30 – 12:00</span>
        </div>

        <!-- Empty tasks state -->
        <div *ngIf="allTasks().length === 0 && !loading()" class="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 class="font-bold text-gray-900 mb-1">Aucune tâche pour aujourd'hui</h3>
          <p class="text-sm text-gray-500 mb-4">Créez vos premières tâches pour organiser votre journée.</p>
          <a routerLink="/tasks" class="inline-flex items-center gap-2 bg-[#3b28cc] text-white px-4 py-2 rounded-xl text-sm font-bold">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Créer une tâche
          </a>
        </div>

        <!-- Task time blocks -->
        <div *ngIf="allTasks().length > 0" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div *ngFor="let task of displayTasks()" class="bg-white border rounded-xl p-3 shadow-sm"
            [class]="task.status === 'DONE' ? 'border-emerald-200 bg-emerald-50/50' : task.status === 'IN_PROGRESS' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold text-gray-400">{{ task.start_time || '—' }}</span>
              <div [class]="task.status === 'DONE' ? 'w-4 h-4 bg-emerald-500 rounded flex items-center justify-center' : task.status === 'IN_PROGRESS' ? 'w-4 h-4 border-2 border-amber-400 rounded-full' : 'w-4 h-4 border-2 border-gray-300 rounded-full'">
                <svg *ngIf="task.status === 'DONE'" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
            <p class="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{{ task.title }}</p>
            <p class="text-[10px] text-[#3b28cc] font-bold mt-1">{{ task.category }}</p>
          </div>
        </div>

        <!-- Progress bar -->
        <div *ngIf="allTasks().length > 0" class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-2xl font-extrabold text-[#3b28cc]">{{ progressPercent() }}%</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Progression de la journée : {{ doneTasks().length }}/{{ allTasks().length }} tâches</p>
                <p class="text-xs text-gray-500 font-medium">L'alignement stratégique est optimal pour la clôture.</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                Ajuster créneaux
              </button>
              <a routerLink="/tasks" class="flex items-center gap-1.5 bg-[#3b28cc] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#3222b0] transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Clôturer la journée &amp; faire le bilan
              </a>
            </div>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div class="bg-[#3b28cc] h-2 rounded-full transition-all" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class FocusComponent implements OnInit {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  auth = inject(AuthService);

  allTasks = signal<Task[]>([]);
  topGoals = signal<Goal[]>([]);
  loading = signal(true);

  readonly today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());

  ngOnInit() {
    this.taskService.getAll().subscribe({ next: t => { this.allTasks.set(t); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.goalService.getAll().subscribe({ next: g => this.topGoals.set(g.filter(x => x.year === new Date().getFullYear())), error: () => {} });
  }

  northStar() { return this.topGoals().length > 0 ? this.topGoals()[0] : null; }
  inProgressTasks() { return this.allTasks().filter(t => t.status === 'IN_PROGRESS'); }
  todoTasks() { return this.allTasks().filter(t => t.status === 'TODO' || t.status === 'LATE'); }
  doneTasks() { return this.allTasks().filter(t => t.status === 'DONE'); }
  alignedTasks() { return this.allTasks().filter(t => t.status !== 'DONE'); }
  displayTasks() { return this.allTasks().slice(0, 4); }
  progressPercent() {
    const total = this.allTasks().length;
    if (!total) return 0;
    return Math.round((this.doneTasks().length / total) * 100);
  }
  totalFocusTime() {
    const active = this.inProgressTasks().length + this.todoTasks().length;
    return Math.ceil(active * 0.75);
  }
}
