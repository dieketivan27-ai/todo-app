import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, OnChanges, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Goal } from '../../models/task.model';
import { GoalStepsComponent } from './goal-steps.component';
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, LineController } from 'chart.js';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, LineController);

@Component({
  selector: 'app-goal-card',
  standalone: true,
  imports: [CommonModule, GoalStepsComponent],
  template: `
<div class="goal-card" [class.goal-late]="goal.stats.isLate">

  <!-- Header -->
  <div class="goal-card-header">
    <div class="goal-icon" [style.background]="goal.color + '22'" [style.color]="goal.color">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    </div>
    <div class="goal-card-title">
      <h3>{{ goal.title }}</h3>
      <span class="goal-category">{{ goal.category }}</span>
    </div>
    <div class="goal-actions">
      <button (click)="onEdit()" class="goal-action-btn" title="Modifier">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      <button (click)="onDelete()" class="goal-action-btn goal-action-delete" title="Supprimer">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Late badge -->
  <div *ngIf="goal.stats.isLate" class="late-banner">
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
    </svg>
    En retard — Taux d'évolution : {{ goal.stats.evolutionRate }}%
  </div>

  <!-- KPIs Row -->
  <div class="kpi-row">
    <div class="kpi-box">
      <span class="kpi-label">Annuel</span>
      <span class="kpi-value" [style.color]="goal.color">{{ goal.stats.annualPct }}%</span>
      <span class="kpi-sub">{{ goal.stats.annualDone }} / {{ goal.annual_target }}</span>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Ce mois</span>
      <span class="kpi-value" [class.kpi-ok]="goal.stats.monthlyPct >= 80" [class.kpi-warn]="goal.stats.monthlyPct < 80">{{ goal.stats.monthlyPct }}%</span>
      <span class="kpi-sub">{{ goal.stats.monthDone }} / {{ goal.stats.monthlyTarget }}</span>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Cette semaine</span>
      <span class="kpi-value" [class.kpi-ok]="goal.stats.weeklyPct >= 80" [class.kpi-warn]="goal.stats.weeklyPct < 80">{{ goal.stats.weeklyPct }}%</span>
      <span class="kpi-sub">{{ goal.stats.weekDone }} / {{ goal.stats.weeklyTarget }}</span>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Taux évol.</span>
      <span class="kpi-value" [class.kpi-ok]="goal.stats.evolutionRate >= 85" [class.kpi-late]="goal.stats.evolutionRate < 85">{{ goal.stats.evolutionRate }}%</span>
      <span class="kpi-sub">vs rythme idéal</span>
    </div>
  </div>

  <!-- Annual progress bar -->
  <div class="progress-section">
    <div class="progress-header">
      <span>Progression annuelle</span>
      <span>Sem. {{ goal.stats.currentWeek }}/52</span>
    </div>
    <div class="progress-track">
      <!-- Ideal marker -->
      <div class="progress-ideal-marker" [style.left.%]="goal.stats.idealPacePct" title="Objectif idéal : {{ goal.stats.idealPacePct }}%"></div>
      <!-- Actual bar -->
      <div class="progress-fill" [style.width.%]="goal.stats.annualPct" [style.background]="goal.color"></div>
    </div>
    <div class="progress-legend">
      <span class="legend-actual" [style.color]="goal.color">■ Réel : {{ goal.stats.annualPct }}%</span>
      <span class="legend-ideal">⬥ Idéal : {{ goal.stats.idealPacePct }}%</span>
    </div>
  </div>

  <!-- Mini Chart -->
  <div class="chart-wrap" *ngIf="goal.weeklyData && goal.weeklyData.length > 1">
    <canvas #chartCanvas></canvas>
  </div>

  <!-- Étapes hebdomadaires -->
  <div class="flex justify-center pt-2">
    <button (click)="toggleSteps()" class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" *ngIf="!showSteps()">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" *ngIf="showSteps()">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
      </svg>
      {{ showSteps() ? 'Masquer les étapes' : 'Voir les étapes hebdomadaires' }}
    </button>
  </div>

  <app-goal-steps [goalId]="goal.id" *ngIf="showSteps()"></app-goal-steps>

</div>
  `
})
export class GoalCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() goal!: Goal;
  @Output() edit = new EventEmitter<Goal>();
  @Output() delete = new EventEmitter<number>();
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  showSteps = signal(false);
  private chart: Chart | null = null;

  toggleSteps() {
    this.showSteps.set(!this.showSteps());
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    setTimeout(() => this.renderChart(), 50);
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  renderChart() {
    if (!this.chartCanvas || !this.goal?.weeklyData?.length) return;
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.goal.weeklyData.map(d => `S${d.week}`);
    const actualData = this.goal.weeklyData.map(d => d.actual);
    const idealData = this.goal.weeklyData.map(d => d.ideal);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Réel',
            data: actualData,
            borderColor: this.goal.color,
            backgroundColor: this.goal.color + '22',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: 'Idéal',
            data: idealData,
            borderColor: '#94a3b8',
            borderDash: [4, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            borderWidth: 1.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) => `Semaine ${items[0].label.replace('S', '')}`,
              label: (item) => `${item.dataset.label}: ${item.parsed.y} tâches`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 9 },
              maxTicksLimit: 8,
              maxRotation: 0
            }
          },
          y: {
            grid: { color: '#1e293b' },
            ticks: { color: '#94a3b8', font: { size: 9 } },
            beginAtZero: true
          }
        }
      }
    });
  }

  onEdit() { this.edit.emit(this.goal); }
  onDelete() { this.delete.emit(this.goal.id); }
}
