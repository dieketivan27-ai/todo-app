import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { GoalService } from '../../services/goal.service';
import { TaskCreate, CATEGORIES, Goal } from '../../models/task.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 mb-1">Projets</h1>
          <p class="text-sm text-gray-500 font-medium">Gérez vos projets et organisez vos objectifs.</p>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="true" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Aucun projet pour l'instant</h3>
        <p class="text-gray-500 font-medium mb-6 max-w-sm">Les projets regroupent vos objectifs et tâches. Créez votre premier objectif dans la section <strong>Objectifs</strong> pour commencer.</p>
        <div class="flex gap-3">
          <a routerLink="/goals" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Créer un objectif
          </a>
          <a routerLink="/tasks" class="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Ajouter des tâches
          </a>
        </div>
      </div>

      <!-- Nouvelle tâche rapide (always visible) -->
      <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-[#3b28cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h3 class="font-extrabold text-gray-900">Nouvelle tâche rapide</h3>
            <p class="text-xs text-gray-500 font-medium">Planifiez et reliez instantanément une action concrète à vos objectifs.</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2">
              <label class="block text-xs font-bold text-gray-700 mb-1">Titre de la tâche *</label>
              <input type="text" [(ngModel)]="quickTask.title" placeholder="Ex. Corriger les routes de rafraîchissement des tokens"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-colors">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Catégorie</label>
              <select [(ngModel)]="quickTask.category"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Date d'exécution</label>
              <input type="date" [(ngModel)]="quickTask.deadline"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Heure de blocage</label>
              <input type="time" [(ngModel)]="quickTask.start_time"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Durée estimée</label>
              <select [(ngModel)]="quickTask.end_time"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                <option value="15 min">15 min</option>
                <option value="30 min">30 min</option>
                <option value="45 min" selected>45 min</option>
                <option value="1 h">1 h</option>
                <option value="1h30">1h30</option>
                <option value="2 h">2 h</option>
                <option value="3 h">3 h</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Priorité</label>
              <select [(ngModel)]="quickTask.priority"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                <option value="HIGH">Haute</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="LOW">Faible</option>
              </select>
            </div>
          </div>
        </div>

        <div *ngIf="formError()" class="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{{ formError() }}</div>
        <div *ngIf="formSuccess()" class="mt-3 text-sm text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">✓ Tâche créée et planifiée avec succès !</div>

        <div class="flex items-center justify-end gap-3 mt-5 pt-5 border-t border-gray-100">
          <button (click)="resetForm()" class="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Réinitialiser</button>
          <button (click)="createQuickTask()" [disabled]="saving()"
            class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
            <svg *ngIf="saving()" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            Créer et planifier
          </button>
        </div>
      </div>

    </div>
  `
})
export class ProjectsComponent implements OnInit {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);

  goals = signal<Goal[]>([]);
  saving = signal(false);
  formError = signal<string | null>(null);
  formSuccess = signal(false);
  categories = CATEGORIES;

  quickTask: TaskCreate = {
    title: '',
    category: 'Général',
    priority: 'HIGH',
    deadline: '',
    start_time: '',
    end_time: '45 min'
  };

  ngOnInit() {
    this.goalService.getAll().subscribe({ next: g => this.goals.set(g), error: () => {} });
  }

  resetForm() {
    this.quickTask = { title: '', category: 'Général', priority: 'HIGH', deadline: '', start_time: '', end_time: '45 min' };
    this.formError.set(null);
    this.formSuccess.set(false);
  }

  createQuickTask() {
    if (!this.quickTask.title.trim()) { this.formError.set('Le titre est requis.'); return; }
    this.saving.set(true);
    this.formError.set(null);
    this.formSuccess.set(false);
    this.taskService.create(this.quickTask).subscribe({
      next: () => {
        this.saving.set(false);
        this.formSuccess.set(true);
        this.resetForm();
        setTimeout(() => this.formSuccess.set(false), 3000);
      },
      error: () => { this.saving.set(false); this.formError.set('Une erreur est survenue.'); }
    });
  }
}
