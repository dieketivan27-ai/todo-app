import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Task, Goal, TaskStats } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { GoalService } from '../../services/goal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">

      <!-- Hero Banner -->
      <div class="bg-gradient-to-r from-[#3b28cc] to-[#8b5cf6] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div class="absolute bottom-0 right-32 w-48 h-48 bg-purple-400 opacity-20 rounded-full filter blur-2xl translate-y-1/2"></div>
        <div class="relative z-10 flex items-center justify-between">
          <div class="flex-1">
            <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-semibold mb-4 border border-white/20">
              <span class="text-amber-300">⚡</span> Cascade Engine V3.4 • Alignement Stratégique
            </div>
            <h1 class="text-3xl font-extrabold mb-3">
              Ma Journée : Flux &amp; Clarté
            </h1>
            <p class="text-indigo-100 max-w-xl font-medium mb-6">
              Vos actions d'aujourd'hui propulsent directement <strong class="text-white">{{ topGoals().length }} objectifs stratégiques</strong> majeurs.
            </p>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span> {{ stats()?.done || 0 }} terminées
              </span>
              <span class="bg-amber-400/20 text-amber-200 border border-amber-400/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> {{ stats()?.inProgress || 0 }} en cours
              </span>
              <span class="bg-white/10 text-indigo-100 border border-white/20 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-indigo-200"></span> {{ stats()?.todo || 0 }} restantes
              </span>
            </div>
          </div>

          <!-- Donut Progress -->
          <div class="flex-shrink-0 flex flex-col items-center ml-8" *ngIf="stats()">
            <div class="relative w-32 h-32">
              <svg viewBox="0 0 100 100" class="transform -rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2dd4bf" stroke-width="12"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="251.2"
                  [attr.stroke-dashoffset]="251.2 * (1 - (stats()!.completionRate / 100))"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-extrabold text-white">{{ stats()!.completionRate }}%</span>
              </div>
            </div>
            <p class="text-indigo-100 text-xs font-bold mt-2 text-center">PROGRESSION GLOBALE</p>
            <p class="text-white text-sm font-extrabold text-center">Excellent focus</p>
            <p class="text-emerald-300 text-xs font-bold">+18% de vitesse</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left 2/3: Priorités du jour -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              Mes priorités du jour
              <span class="bg-indigo-50 text-[#3b28cc] text-xs font-bold px-2 py-0.5 rounded-lg border border-indigo-100">{{ activeTasks().length }} Tâches Clés</span>
            </h2>
            <a routerLink="/tasks" class="text-sm text-[#3b28cc] font-bold hover:underline flex items-center gap-1">
              Vue complète <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>

          <!-- Empty state -->
          <div *ngIf="activeTasks().length === 0 && !loading()" class="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 class="font-bold text-gray-900 mb-1">Aucune tâche active</h3>
            <p class="text-sm text-gray-500 mb-4">Créez vos premières tâches pour commencer.</p>
            <a routerLink="/tasks" class="inline-flex items-center gap-2 bg-[#3b28cc] text-white px-4 py-2 rounded-xl text-sm font-bold">+ Nouvelle tâche</a>
          </div>

          <!-- In Progress Tasks -->
          <div *ngFor="let task of inProgressTasks()" class="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 rounded-l-2xl"></div>
            <div class="flex items-center justify-between">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-gray-900 text-sm truncate">{{ task.title }}</h3>
                  <div class="flex items-center gap-2 mt-1 text-[11px] font-semibold text-gray-500">
                    <span class="text-[#3b28cc]">{{ task.category }}</span>
                    <span *ngIf="task.deadline">· {{ task.deadline | date:'d MMM' }}</span>
                    <span [class]="task.priority === 'HIGH' ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100' : 'text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100'">
                      {{ task.priority === 'HIGH' ? 'Haute' : 'Moyenne' }}
                    </span>
                  </div>
                </div>
              </div>
              <span class="flex-shrink-0 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-3">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Actif
              </span>
            </div>
          </div>

          <!-- Todo Tasks -->
          <div *ngFor="let task of todoTasks().slice(0, 3)" class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div class="flex items-center justify-between">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-gray-900 text-sm truncate">{{ task.title }}</h3>
                  <div class="flex items-center gap-2 mt-1 text-[11px] font-semibold text-gray-500">
                    <span class="text-[#3b28cc]">{{ task.category }}</span>
                    <span *ngIf="task.deadline">· {{ task.deadline | date:'d MMM' }}</span>
                    <span [class]="task.priority === 'HIGH' ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100' : task.priority === 'MEDIUM' ? 'text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100' : 'text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100'">
                      {{ task.priority === 'HIGH' ? 'Haute' : task.priority === 'MEDIUM' ? 'Moyenne' : 'Faible' }}
                    </span>
                  </div>
                </div>
              </div>
              <a routerLink="/focus" class="flex-shrink-0 bg-indigo-50 text-[#3b28cc] border border-indigo-100 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ml-3 hover:bg-indigo-100 transition-colors">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Focus
              </a>
            </div>
          </div>
        </div>

        <!-- Right 1/3: Ma progression -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-extrabold text-gray-900">Ma progression</h2>
            <a routerLink="/goals" class="text-sm text-[#3b28cc] font-bold hover:underline flex items-center gap-1">
              Cascade <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>

          <div *ngIf="topGoals().length === 0 && !loading()" class="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-bold text-gray-900 text-sm mb-1">Aucun objectif</h3>
            <p class="text-xs text-gray-500 mb-3">Définissez vos objectifs annuels.</p>
            <a routerLink="/goals" class="inline-flex items-center gap-1 bg-[#3b28cc] text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Créer</a>
          </div>

          <div *ngIf="topGoals().length > 0" class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div *ngFor="let goal of topGoals()" class="space-y-1">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" [style.backgroundColor]="goal.color || '#3b28cc'"></span>
                  <span class="font-bold text-gray-800 text-xs truncate">{{ goal.title }}</span>
                </div>
                <span class="font-extrabold text-sm flex-shrink-0 ml-2" [style.color]="goal.color || '#3b28cc'">{{ goal.stats.annualPct }}%</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="h-2 rounded-full transition-all" [style.width]="goal.stats.annualPct + '%'" [style.backgroundColor]="goal.color || '#3b28cc'"></div>
              </div>
              <p class="text-[10px] text-gray-400 font-medium">{{ goal.stats.annualDone }} sur {{ goal.annual_target }} jalons franchis</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  auth = inject(AuthService);

  allTasks = signal<Task[]>([]);
  topGoals = signal<Goal[]>([]);
  stats = signal<TaskStats | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.taskService.getAll().subscribe({ next: t => { this.allTasks.set(t); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.taskService.getStats().subscribe({ next: s => this.stats.set(s), error: () => {} });
    this.goalService.getAll().subscribe({ next: g => this.topGoals.set(g.filter(x => x.year === new Date().getFullYear()).slice(0, 4)), error: () => {} });
  }

  activeTasks() { return this.allTasks().filter(t => t.status !== 'DONE'); }
  inProgressTasks() { return this.allTasks().filter(t => t.status === 'IN_PROGRESS'); }
  todoTasks() { return this.allTasks().filter(t => t.status === 'TODO' || t.status === 'LATE'); }
}
