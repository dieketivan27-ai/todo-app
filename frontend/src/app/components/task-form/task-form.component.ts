import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskCreate, TaskUpdate, CATEGORIES } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnInit {
  @Input() task: Task | null = null; // null = création, sinon édition
  @Output() save = new EventEmitter<TaskCreate | TaskUpdate>();
  @Output() cancel = new EventEmitter<void>();

  categories = CATEGORIES;

  form: TaskCreate = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'Général',
    deadline: ''
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
        deadline: this.task.deadline ?? ''
      };
    }
  }

  onSubmit() {
    if (!this.form.title.trim()) return;
    this.save.emit({ ...this.form });
  }
}
