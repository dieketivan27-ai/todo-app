import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, PRIORITY_LABELS, STATUS_LABELS } from '../../models/task.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-item.component.html'
})
export class TaskItemComponent {
  @Input() task!: Task;
  @Output() edit = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<number>();
  @Output() markDone = new EventEmitter<number>();
  @Output() markInProgress = new EventEmitter<number>();

  priorityLabels = PRIORITY_LABELS;
  statusLabels = STATUS_LABELS;

  get isLate(): boolean {
    if (!this.task.deadline || this.task.status === 'DONE') return false;
    return new Date(this.task.deadline) < new Date(new Date().toDateString());
  }

  get daysUntilDeadline(): number | null {
    if (!this.task.deadline) return null;
    const diff = new Date(this.task.deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get deadlineLabel(): string {
    const days = this.daysUntilDeadline;
    if (days === null) return '';
    if (days < 0) return `${Math.abs(days)}j de retard`;
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return `Dans ${days}j`;
  }

  get subtaskLabel(): string | null {
    const list = this.task.subtasks;
    if (!list?.length) return null;
    const done = list.filter(s => s.terminee).length;
    return `${done}/${list.length} sous-tâches`;
  }

  get deadlineColor(): string {
    const days = this.daysUntilDeadline;
    if (days === null) return '';
    if (days < 0) return 'text-red-600 dark:text-red-400';
    if (days <= 1) return 'text-orange-600 dark:text-orange-400';
    if (days <= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-500 dark:text-gray-400';
  }
}
