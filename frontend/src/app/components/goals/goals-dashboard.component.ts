import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Goal, GoalCreate, GOAL_COLORS, CATEGORIES } from '../../models/task.model';
import { GoalService } from '../../services/goal.service';
import { GoalCardComponent } from './goal-card.component';
import { GoalFormComponent } from './goal-form.component';
import { ScanDocumentComponent } from './scan-document.component';

@Component({
  selector: 'app-goals-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, GoalCardComponent, GoalFormComponent, ScanDocumentComponent],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-2xl font-extrabold text-gray-900">Objectifs Annuels</h1>
            <span class="bg-[#3b28cc]/10 text-[#3b28cc] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Cascade Active</span>
          </div>
          <p class="text-sm text-gray-500 font-medium">Suivez vos objectifs et leur décomposition en étapes hebdomadaires.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="showScanModal.set(true)"
            class="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Scanner un document
          </button>
          <button (click)="openCreateForm()"
            class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nouvel objectif
          </button>
        </div>
      </div>

      <!-- Year selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-gray-500">Année :</span>
        <div class="flex items-center bg-gray-100 p-1 rounded-xl">
          <button *ngFor="let y of years" (click)="onYearChange(y)"
            class="px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
            [class]="selectedYear() === y ? 'bg-white text-[#3b28cc] shadow-sm' : 'text-gray-500 hover:text-gray-900'">
            {{ y }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="flex items-center justify-center py-16">
        <div class="flex items-center gap-3 text-gray-400">
          <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          Chargement...
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && goals().length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Aucun objectif pour {{ selectedYear() }}</h3>
        <p class="text-gray-500 font-medium mb-6 max-w-sm">Créez votre premier objectif annuel ou scannez un document pour importer vos objectifs existants.</p>
        <div class="flex gap-3">
          <button (click)="showScanModal.set(true)" class="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">📄 Scanner un doc</button>
          <button (click)="openCreateForm()" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">✨ Créer un objectif</button>
        </div>
      </div>

      <!-- Goals List -->
      <div *ngIf="!loading() && goals().length > 0" class="space-y-4">
        <app-goal-card
          *ngFor="let goal of goals()"
          [goal]="goal"
          (edit)="openEditForm($event)"
          (delete)="onDeleteGoal($event)">
        </app-goal-card>
      </div>

      <!-- Form Modal -->
      <app-goal-form
        *ngIf="showForm()"
        [initialData]="editingGoal() ? { title: editingGoal()!.title, category: editingGoal()!.category, annual_target: editingGoal()!.annual_target, year: editingGoal()!.year, color: editingGoal()!.color, description: editingGoal()!.description } : null"
        [isEdit]="!!editingGoal()"
        (save)="onSave($event)"
        (cancel)="closeForm()">
      </app-goal-form>

      <!-- Scan Modal -->
      <app-scan-document
        *ngIf="showScanModal()"
        (goalsImported)="onGoalsImported($event)"
        (close)="showScanModal.set(false)">
      </app-scan-document>

    </div>
  `
})
export class GoalsDashboardComponent implements OnInit {
  private goalService = inject(GoalService);

  goals = signal<Goal[]>([]);
  loading = signal(false);
  showForm = signal(false);
  showScanModal = signal(false);
  editingGoal = signal<Goal | null>(null);
  selectedYear = signal(new Date().getFullYear());

  readonly years = [2024, 2025, 2026, 2027];

  ngOnInit() { this.loadGoals(); }

  loadGoals() {
    this.loading.set(true);
    this.goalService.getAll().subscribe({
      next: (goals) => {
        // Filter by selected year
        this.goals.set(goals.filter(g => g.year === this.selectedYear()));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.loadGoals();
  }

  openCreateForm() { this.editingGoal.set(null); this.showForm.set(true); }
  openEditForm(goal: Goal) { this.editingGoal.set(goal); this.showForm.set(true); }
  closeForm() { this.showForm.set(false); this.editingGoal.set(null); }

  onSave(data: GoalCreate) {
    const editing = this.editingGoal();
    if (editing) {
      this.goalService.update(editing.id, data).subscribe({
        next: () => { this.closeForm(); this.loadGoals(); }
      });
    } else {
      this.goalService.create(data).subscribe({
        next: () => { this.closeForm(); this.loadGoals(); }
      });
    }
  }

  onGoalsImported(goals: GoalCreate[]) {
    this.showScanModal.set(false);
    const createNext = (index: number) => {
      if (index >= goals.length) { this.loadGoals(); return; }
      this.goalService.create(goals[index]).subscribe({
        next: () => createNext(index + 1),
        error: () => createNext(index + 1)
      });
    };
    createNext(0);
  }

  onDeleteGoal(id: number) {
    if (!confirm('Supprimer cet objectif et toutes ses étapes ?')) return;
    this.goalService.delete(id).subscribe({ next: () => this.loadGoals() });
  }
}
