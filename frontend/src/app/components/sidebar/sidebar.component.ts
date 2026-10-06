import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { TaskStats } from '../../models/task.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 overflow-y-auto z-50 shadow-sm">

      <!-- Logo -->
      <div class="p-6 flex items-center gap-3">
        <div class="w-10 h-10 bg-[#3b28cc] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="font-bold text-gray-900 text-lg leading-tight flex items-center gap-1">FocusFlow <span class="bg-indigo-100 text-[#3b28cc] text-[10px] px-1.5 py-0.5 rounded-md font-bold">PRO</span></h1>
          <p class="text-xs text-gray-500 font-medium leading-tight mt-0.5">Cascade Productivity</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex-1 px-4 py-2 space-y-1">
        <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">NAVIGATION</p>

        <!-- Dashboard -->
        <a routerLink="/dashboard" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
          Dashboard
        </a>

        <!-- Ma journée -->
        <a routerLink="/focus" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            Ma journée
          </div>
          <span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Focus</span>
        </a>

        <!-- Tâches -->
        <a routerLink="/tasks" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Tâches
          </div>
          <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{{ stats()?.total || 0 }}</span>
        </a>

        <!-- Objectifs -->
        <a routerLink="/goals" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Objectifs
          </div>
          <span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Cascade</span>
        </a>

        <!-- Projets -->
        <a routerLink="/projects" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            Projets
          </div>
          <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">3</span>
        </a>

        <!-- Planning -->
        <a routerLink="/planning" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Planning
        </a>

        <!-- Analytics -->
        <a routerLink="/analytics" routerLinkActive="!bg-[#3b28cc] !text-white shadow-lg shadow-indigo-200"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Analytics
        </a>
      </div>


      <!-- User Profile -->
      <div class="p-4 border-t border-gray-100 flex items-center justify-between" *ngIf="auth.currentUser$ | async as user">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#3b28cc] flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="text-sm font-bold text-gray-900 leading-tight">{{ user.name }}</p>
            <p class="text-xs text-gray-500 truncate w-28">{{ user.email }}</p>
          </div>
        </div>
        <button (click)="auth.logout()" class="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        </button>
      </div>

    </div>
  `
})
export class SidebarComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  private taskService = inject(TaskService);

  stats = signal<TaskStats | null>(null);

  ngOnInit() {
    this.taskService.getStats().subscribe({ next: s => this.stats.set(s), error: () => {} });
  }
}
