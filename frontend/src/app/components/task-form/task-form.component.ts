import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskCreate, TaskUpdate, CATEGORIES } from '../../models/task.model';
import { TaskSubtasksComponent } from '../task-subtasks/task-subtasks.component';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskSubtasksComponent],
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnInit {
  @Input() task: Task | null = null; // null = création, sinon édition
  @Output() save = new EventEmitter<TaskCreate | TaskUpdate>();
  @Output() cancel = new EventEmitter<void>();

  private taskService = inject(TaskService);
  categories = CATEGORIES;

  form: TaskCreate = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'Général',
    deadline: '',
    start_time: '',
    end_time: ''
  };

  get isEditing(): boolean {
    return !!this.task;
  }

  ngOnInit() {
    if (this.task) {
      this.form = {
        title: this.task.title,
        description: this.task.description ?? '',
        priority: this.task.priority,
        category: this.task.category,
        deadline: this.task.deadline ?? '',
        start_time: this.task.start_time ?? '',
        end_time: this.task.end_time ?? ''
      };
    }
  }

  onSubmit() {
    if (!this.form.title.trim()) return;
    this.save.emit({ ...this.form });
  }

  onCompleteParent() {
    if (!this.task) return;
    this.taskService.markDone(this.task.id).subscribe({
      next: () => {
        if (this.task) this.task = { ...this.task, status: 'DONE' };
      }
    });
  }
}
