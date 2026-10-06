import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 mb-1">Planning &amp; Time-blocking</h1>
          <p class="text-sm text-gray-500 font-medium">Organisation temporelle par blocs de concentration ininterrompue.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="goToToday()" *ngIf="weekOffset() !== 0" class="text-sm font-bold text-[#3b28cc] hover:underline mr-2 transition-all">
            Aujourd'hui
          </button>
          <button (click)="prevWeek()" class="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">Semaine {{ weekNum() }} • {{ weekRange() }}</span>
          <button (click)="nextWeek()" class="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Week Calendar -->
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div class="grid grid-cols-7">
          <div *ngFor="let day of weekDays(); let i = index"
            class="p-4 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors"
            [class]="i === selectedDay() ? 'bg-[#3b28cc] text-white' : 'hover:bg-gray-50'"
            (click)="selectedDay.set(i)">
            <p class="text-[10px] font-bold uppercase tracking-wider mb-1" [class]="i === selectedDay() ? 'text-indigo-200' : 'text-gray-400'">{{ day.label }}</p>
            <p class="text-2xl font-extrabold">{{ day.num }}</p>
            <p class="text-[11px] font-semibold mt-1" [class]="i === selectedDay() ? 'text-indigo-200' : 'text-gray-400'">
              {{ getTasksForDay(i).length }} créneaux
            </p>
          </div>
        </div>
      </div>

      <!-- Day view -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Blocs programmés pour {{ weekDays()[selectedDay()].label }} {{ weekDays()[selectedDay()].num }} {{ currentMonth() }}
          </div>
          <div class="bg-[#3b28cc]/10 text-[#3b28cc] text-xs font-bold px-3 py-1.5 rounded-xl">
            {{ getTotalFocusHours() }}h 00m Total Focus
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="displayTasks().length === 0" class="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div class="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Aucun bloc programmé</h3>
          <p class="text-gray-500 font-medium mb-5 max-w-sm mx-auto">Créez des tâches avec des horaires pour voir votre planning hebdomadaire ici.</p>
          <a routerLink="/tasks" class="inline-flex items-center gap-2 bg-[#3b28cc] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#3222b0] transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Créer des tâches
          </a>
        </div>

        <!-- Task blocks -->
        <div *ngIf="displayTasks().length > 0" class="space-y-3">
          <div *ngFor="let task of displayTasks()" class="bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4"
            [class]="task.status === 'DONE' ? 'border-emerald-200 bg-emerald-50/30' : task.status === 'IN_PROGRESS' ? 'border-amber-200' : 'border-gray-100'">
            <!-- Time slot -->
            <div class="flex-shrink-0 text-center min-w-[90px]">
              <span class="text-xs font-extrabold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg block">
                {{ task.start_time || '—' }}
              </span>
            </div>

            <!-- Title & tags -->
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-gray-900 text-sm truncate">{{ task.title }}</h4>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-bold text-[#3b28cc] bg-indigo-50 px-1.5 py-0.5 rounded">{{ task.category }}</span>
                <span class="text-[10px] font-bold text-gray-400">• DEEP WORK</span>
              </div>
            </div>

            <!-- Status badge -->
            <div class="flex-shrink-0">
              <span *ngIf="task.status === 'DONE'"
                class="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Complété
              </span>
              <span *ngIf="task.status === 'IN_PROGRESS'"
                class="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                En cours
              </span>
              <span *ngIf="task.status === 'TODO' || task.status === 'LATE'"
                class="flex items-center gap-1.5 bg-indigo-50 text-[#3b28cc] border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                Prévu
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class PlanningComponent implements OnInit {
  private taskService = inject(TaskService);

  tasks = signal<Task[]>([]);
  
  weekOffset = signal(0);
  selectedDay = signal(0);
  
  weekDays = signal<{ label: string; num: number; date: Date }[]>([]);
  weekNum = signal(0);
  weekRange = signal('');
  currentMonth = signal('');
  todayIndex = 0;

  constructor() {
    this.computeWeek(0);
  }

  ngOnInit() {
    this.taskService.getAll().subscribe({ next: t => this.tasks.set(t), error: () => {} });
  }

  computeWeek(offset: number) {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7));
    
    // Get Monday of that week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const labels = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ label: labels[i], num: d.getDate(), date: d });
    }
    this.weekDays.set(days);

    if (offset === 0) {
      this.todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      this.selectedDay.set(this.todayIndex);
    } else {
      this.selectedDay.set(0); // If not current week, select Monday by default
    }

    // Week number calculation (ISO)
    const target = new Date(today.valueOf());
    const dayNr = (today.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    this.weekNum.set(1 + Math.ceil((firstThursday - target.valueOf()) / 604800000));

    // Week range
    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    this.weekRange.set(`${monday.getDate()} – ${sun.getDate()} ${sun.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
    this.currentMonth.set(today.toLocaleDateString('fr-FR', { month: 'long' }));
  }

  prevWeek() {
    this.weekOffset.update(v => v - 1);
    this.computeWeek(this.weekOffset());
  }

  nextWeek() {
    this.weekOffset.update(v => v + 1);
    this.computeWeek(this.weekOffset());
  }

  goToToday() {
    this.weekOffset.set(0);
    this.computeWeek(0);
  }

  getTasksForDay(dayIndex: number): Task[] {
    const day = this.weekDays()[dayIndex];
    return this.tasks().filter(t => {
      if (t.deadline) {
        const d = new Date(t.deadline);
        return d.getDate() === day.date.getDate() && d.getMonth() === day.date.getMonth() && d.getFullYear() === day.date.getFullYear();
      }
      return false; // Only show tasks with specific deadlines in the planner
    });
  }

  displayTasks(): Task[] {
    return this.getTasksForDay(this.selectedDay());
  }

  getTotalFocusHours(): number {
    return Math.max(0, Math.ceil(this.displayTasks().length * 1.5));
  }
}
