import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController } from 'chart.js';
import { TaskService } from '../../services/task.service';
import { TaskStats } from '../../models/task.model';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
      
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-extrabold text-gray-900 mb-1">Centre d'Analytics</h1>
        <p class="text-sm text-gray-500 font-medium mb-6">Analyse approfondie de votre performance et de votre équilibre d'énergie.</p>
        
        <div class="flex items-center gap-2 border-b border-gray-100 pb-px" *ngIf="hasData()">
          <button class="px-4 py-2 text-sm font-bold text-[#3b28cc] border-b-2 border-[#3b28cc]">Vue d'ensemble</button>
          <button class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Deep Work</button>
          <button class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Projets</button>
          <button class="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Tendances</button>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && !hasData()" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-[#3b28cc] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Pas encore de données d'analyse</h3>
        <p class="text-gray-500 font-medium mb-6 max-w-sm">Vous venez de commencer ! Les graphiques d'analyse s'afficheront ici une fois que vous aurez accompli quelques tâches et planifié des créneaux de travail.</p>
        <div class="flex gap-3">
          <a routerLink="/tasks" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Ajouter des tâches
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" *ngIf="hasData()">
        
        <!-- Main Chart -->
        <div class="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-gray-900">Productivité (Deep Work vs Admin)</h3>
            <select class="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20">
              <option>14 derniers jours</option>
              <option>30 derniers jours</option>
            </select>
          </div>
          <div class="h-64 relative w-full">
            <canvas #barChart></canvas>
          </div>
        </div>

        <!-- Right Top: Focus Score -->
        <div class="bg-gradient-to-br from-[#3b28cc] to-[#5b42f5] border border-indigo-500/20 rounded-3xl p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full filter blur-xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div class="relative z-10">
            <h3 class="font-bold text-indigo-100 text-sm mb-4">Score Focus Hebdomadaire</h3>
            <div class="flex items-end gap-3 mb-2">
              <span class="text-6xl font-extrabold tracking-tighter">{{ stats()?.completionRate || 0 }}</span>
              <span class="text-indigo-200 font-bold text-lg mb-2">/100</span>
            </div>
            <span class="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
              {{ (stats()?.completionRate || 0) > 80 ? 'Excellente concentration' : (stats()?.completionRate || 0) > 50 ? 'Bonne concentration' : 'Besoin de focus' }}
            </span>
          </div>

          <div class="mt-8 relative z-10">
            <div class="flex justify-between text-xs text-indigo-200 font-semibold mb-1">
              <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span>
            </div>
            <div class="flex justify-between items-end h-10 gap-1.5">
              <div class="w-full bg-white/20 rounded-t-sm" style="height: 60%"></div>
              <div class="w-full bg-white/20 rounded-t-sm" style="height: 80%"></div>
              <div class="w-full bg-white/40 rounded-t-sm" style="height: 90%"></div>
              <div class="w-full bg-white/20 rounded-t-sm" style="height: 70%"></div>
              <div class="w-full bg-white rounded-t-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]" style="height: 100%"></div>
            </div>
          </div>
        </div>

        <!-- Bottom Left: Donut Chart -->
        <div class="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col">
          <h3 class="font-bold text-gray-900 mb-6">Répartition</h3>
          
          <div class="flex items-center gap-6 flex-1">
            <div class="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                <!-- Fallback si pas de détails dispo, un simple cercle de progression globale -->
                <path class="text-gray-100" stroke-width="6" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path class="text-[#3b28cc]" [attr.stroke-dasharray]="(stats()?.completionRate || 0) + ', 100'" stroke-width="6" stroke="currentColor" fill="none" stroke-linecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
            </div>
            
            <div class="space-y-3 flex-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#3b28cc]"></span> Terminé
                </div>
                <span class="text-xs font-bold text-gray-500">{{ stats()?.done || 0 }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> En cours
                </div>
                <span class="text-xs font-bold text-gray-500">{{ stats()?.inProgress || 0 }}</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <span class="w-2.5 h-2.5 rounded-full bg-gray-200"></span> Restant
                </div>
                <span class="text-xs font-bold text-gray-500">{{ stats()?.todo || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Right: Cascade Performance -->
        <div class="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 class="font-bold text-gray-900 mb-6">Rendement de la Cascade</h3>
          
          <div class="space-y-6">
            <div>
              <div class="flex justify-between items-end mb-2">
                <span class="text-sm font-bold text-gray-700">Objectifs atteints (Jalons)</span>
                <span class="text-sm font-extrabold text-[#3b28cc]">{{ stats()?.done || 0 }}/{{ stats()?.total || 0 }} <span class="text-gray-400 font-medium">cette semaine</span></span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-3">
                <div class="bg-[#3b28cc] h-3 rounded-full transition-all" [style.width]="(stats()?.completionRate || 0) + '%'"></div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
            <p class="text-xs text-gray-500 font-medium">L'alignement global est excellent. Continuez sur cette lancée pour clôturer l'horizon mensuel en avance.</p>
            <button class="text-[#3b28cc] text-xs font-bold hover:underline">Voir le rapport détaillé</button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('barChart') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;
  private taskService = inject(TaskService);

  stats = signal<TaskStats | null>(null);
  loading = signal(true);

  constructor() {
    effect(() => {
      if (this.hasData() && this.barChartCanvas && !this.chart) {
        setTimeout(() => this.renderChart(), 100);
      }
    });
  }

  ngOnInit() {
    this.taskService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  hasData(): boolean {
    const s = this.stats();
    return !!s && s.total > 0;
  }

  ngAfterViewInit() {
    if (this.hasData()) {
      this.renderChart();
    }
  }

  renderChart() {
    if (!this.barChartCanvas) return;
    const ctx = this.barChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8', 'J9', 'J10', 'J11', 'J12', 'J13', 'J14'],
        datasets: [
          {
            label: 'Deep Work (h)',
            data: [4, 5, 3.5, 6, 2, 0, 1, 4.5, 5, 4, 3, 2.5, 1, 5],
            backgroundColor: '#3b28cc',
            borderRadius: 4,
            barPercentage: 0.6
          },
          {
            label: 'Admin / Réunions (h)',
            data: [1, 2, 1.5, 1, 3, 1, 0, 1, 2, 1, 1.5, 2, 0, 1],
            backgroundColor: '#cbd5e1',
            borderRadius: 4,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, usePointStyle: true, font: { size: 11, weight: 'bold' } }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, border: { display: false }, grid: { color: '#f1f5f9' } }
        }
      }
    });
  }
}
