import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskFilters, CATEGORIES } from '../../models/task.model';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html'
})
export class FiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<TaskFilters>>();

  categories = CATEGORIES;

  filters: Partial<TaskFilters> = {
    search: '',
    status: '',
    priority: '',
    category: '',
    sortBy: 'created_at',
    order: 'DESC'
  };

  ngOnInit() {
    this.emit();
  }

  onSearchChange() {
    this.emit();
  }

  onFilterChange() {
    this.emit();
  }

  reset() {
    this.filters = { search: '', status: '', priority: '', category: '', sortBy: 'created_at', order: 'DESC' };
    this.emit();
  }

  private emit() {
    this.filtersChange.emit({ ...this.filters });
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.priority || this.filters.category);
  }
}
