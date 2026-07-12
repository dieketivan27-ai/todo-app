import {
  Component, OnInit, inject, signal, OnDestroy,
  ElementRef, ViewChild, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Goal, GoalCreate, GoalDashboard, Task,
  GOAL_COLORS, CATEGORIES
} from '../../models/task.model';
import { GoalService } from '../../services/goal.service';
import { GoalCardComponent } from './goal-card.component';
import { GoalFormComponent } from './goal-form.component';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Tooltip, Legend, LineController
} from 'chart.js';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, LineController);

@Component({
  selector: 'app-goals-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, GoalCardComponent, GoalFormComponent],
  templateUrl: './goals-dashboard.component.html'
})
export class GoalsDashboardComponent implements OnInit, OnDestroy, AfterViewChecked {
  private goalService = inject(GoalService);

  dashboard = signal<GoalDashboard | null>(null);
  loading = signal(false);
  showForm = signal(false);
  editingGoal = signal<Goal | null>(null);
  selectedYear = signal(new Date().getFullYear());
  activeTab = signal<'overview' | 'alerts'>('overview');

  @ViewChild('globalChartCanvas') globalChartCanvas!: ElementRef<HTMLCanvasElement>;
  private globalChart: Chart | null = null;
  private chartRendered = false;

  readonly years = [2024, 2025, 2026, 2027];

  ngOnInit() { this.loadDashboard(); }

  ngAfterViewChecked() {
    const d = this.dashboard();
    if (d && d.goals.length > 0 && this.globalChartCanvas && !this.chartRendered) {
      this.chartRendered = true;
      this.renderGlobalChart(d);
    }
  }

  ngOnDestroy() { this.globalChart?.destroy(); }

  loadDashboard() {
    this.loading.set(true);
    this.chartRendered = false;
    this.globalChart?.destroy();
    this.globalChart = null;
    this.goalService.getDashboard(this.selectedYear()).subscribe({
      next: data => { this.dashboard.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.loadDashboard();
  }

  openCreateForm() { this.editingGoal.set(null); this.showForm.set(true); }

  openEditForm(goal: Goal) { this.editingGoal.set(goal); this.showForm.set(true); }

  closeForm() { this.showForm.set(false); this.editingGoal.set(null); }

  onSave(data: GoalCreate) {
    const editing = this.editingGoal();
    if (editing) {
      this.goalService.update(editing.id, data).subscribe({
        next: () => { this.closeForm(); this.loadDashboard(); }
      });
    } else {
      this.goalService.create(data).subscribe({
        next: () => { this.closeForm(); this.loadDashboard(); }
      });
    }
  }

  onDeleteGoal(id: number) {
    if (!confirm('Supprimer cet objectif ?')) return;
    this.goalService.delete(id).subscribe({ next: () => this.loadDashboard() });
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Faible' };
    return map[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      HIGH: 'priority-high', MEDIUM: 'priority-medium', LOW: 'priority-low'
    };
    return map[priority] || '';
  }

  getDaysOverdue(deadline: string): number {
    const now = new Date();
    const d = new Date(deadline);
    return Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  renderGlobalChart(data: GoalDashboard) {
    if (!this.globalChartCanvas || !data.goals.length) return;
    if (this.globalChart) {
      this.globalChart.destroy();
      this.globalChart = null;
    }
    const ctx = this.globalChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Build merged label set (max weeks across all goals)
    const maxWeek = Math.max(...data.goals.map(g => g.weeklyData?.length || 0));
    if (maxWeek === 0) return;
    const labels = Array.from({ length: maxWeek }, (_, i) => `S${i + 1}`);

    const datasets = data.goals.map(g => ({
      label: g.title,
      data: g.weeklyData?.map(d => Math.round((d.actual / g.annual_target) * 100)) || [],
      borderColor: g.color,
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2
    }));

    // Add ideal curve (one global)
    if (data.goals[0]?.weeklyData?.length) {
      datasets.push({
        label: 'Rythme idéal',
        data: data.goals[0].weeklyData.map(d => Math.round((d.ideal / data.goals[0].annual_target) * 100)),
        borderColor: '#475569',
        backgroundColor: 'transparent',
        tension: 0,
        pointRadius: 0,
        borderWidth: 1.5,
        // @ts-ignore
        borderDash: [6, 4]
      });
    }

    this.globalChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 16 }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#1e293b44' },
            ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 12, maxRotation: 0 }
          },
          y: {
            grid: { color: '#1e293b44' },
            ticks: {
              color: '#94a3b8', font: { size: 10 },
              callback: (v) => `${v}%`
            },
            min: 0, max: 110
          }
        }
      }
    });
  }
}
