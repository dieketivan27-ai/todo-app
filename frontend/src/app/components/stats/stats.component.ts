import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStats } from '../../models/task.model';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html'
})
export class StatsComponent {
  @Input() stats: TaskStats | null = null;
}
