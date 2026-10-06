import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStats } from '../../models/task.model';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html'
})
export class StatsComponent implements OnChanges, AfterViewInit {
  @Input() stats: TaskStats | null = null;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | null = null;

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stats'] && this.stats) {
      this.renderChart();
    }
  }

  private renderChart() {
    if (!this.donutCanvas || !this.stats) return;
    
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.donutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['À faire', 'En cours', 'Terminées', 'En retard'],
        datasets: [{
          data: [this.stats.todo, this.stats.inProgress, this.stats.done, this.stats.late],
          backgroundColor: [
            '#94a3b8', // slate-400
            '#3b82f6', // blue-500
            '#22c55e', // green-500
            '#ef4444'  // red-500
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#6b7280',
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw}`
            }
          }
        }
      }
    });
  }
}
