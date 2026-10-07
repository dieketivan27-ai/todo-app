import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { TaskCreate, CATEGORIES } from '../../models/task.model';
import { NotificationService, Notification } from '../../services/notification.service';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <header class="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 shadow-sm gap-2 md:gap-4">

      <!-- Left: Burger + Greeting + Date -->
      <div class="flex items-center gap-2 md:gap-4">
        <button (click)="layout.toggleSidebar()" class="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="hidden sm:block">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-extrabold text-gray-900" *ngIf="auth.currentUser$ | async as user">Bonjour {{ user.name.split(' ')[0] }} 👋</h2>
            <span class="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Focus Actif
            </span>
          </div>
          <p class="text-[11px] text-gray-400 font-medium">{{ currentDate }} • Semaine {{ weekNumber }}</p>
        </div>
      </div>

      <!-- Center: Search -->
      <div class="flex-1 max-w-md px-1 md:px-6">
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input type="text" [(ngModel)]="searchQuery" (keyup.enter)="onSearch()"
            class="block w-full pl-10 pr-12 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-all text-sm font-medium"
            placeholder="Rechercher une tâche...">
          <div class="absolute inset-y-0 right-0 pr-2 flex items-center">
            <span class="text-[10px] font-bold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white hidden sm:block">⌘K</span>
          </div>
        </div>
      </div>

      <!-- Right: Actions & User -->
      <div class="flex items-center gap-2 md:gap-3">
        <!-- Nouvelle tâche button - opens modal -->
        <button (click)="showModal.set(true)"
          class="bg-[#3b28cc] hover:bg-[#3222b0] text-white p-2 md:px-4 md:py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span class="hidden md:inline">Nouvelle tâche</span>
        </button>

        <!-- Notifications bell -->
        <div class="relative">
          <button (click)="toggleNotifications()" class="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span *ngIf="unreadCount() > 0" class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <!-- Notifications Dropdown -->
          <div *ngIf="showNotifications()" class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
            <div class="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-bold text-gray-900">Notifications</h3>
              <span class="text-xs font-bold text-[#3b28cc] bg-indigo-50 px-2 py-0.5 rounded-full">{{ unreadCount() }} non lues</span>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <div *ngIf="notifications().length === 0" class="p-6 text-center text-gray-500 text-sm font-medium">
                Aucune notification
              </div>
              <div *ngFor="let notif of notifications()" 
                class="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                [class.bg-indigo-50]="!notif.is_read"
                (click)="markAsRead(notif.id)">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="text-sm font-bold text-gray-900" [class.text-[#3b28cc]]="!notif.is_read">{{ notif.title }}</h4>
                    <p class="text-xs text-gray-500 mt-0.5">{{ notif.message }}</p>
                    <p class="text-[10px] text-gray-400 mt-1 font-medium">{{ notif.created_at | date:'d MMM HH:mm' }}</p>
                  </div>
                  <button (click)="deleteNotif(notif.id, $event)" class="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User chip + Dropdown -->
        <div class="relative user-menu-container" *ngIf="auth.currentUser$ | async as user">
          <button (click)="toggleUserMenu()" class="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 rounded-xl p-1 md:pr-3 hover:bg-indigo-100/60 transition-colors">
            <div class="w-7 h-7 rounded-lg bg-[#3b28cc] flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="hidden md:flex flex-col text-left">
              <span class="text-xs font-extrabold text-gray-900 leading-none">{{ user.name.split(' ')[0] }}</span>
              <span class="text-[10px] font-bold text-[#3b28cc] leading-none mt-0.5">Plan Pro</span>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-400 ml-1 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
          </button>

          <!-- User dropdown -->
          <div *ngIf="showUserMenu()" class="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-1.5 overflow-hidden">
            <!-- User info header -->
            <div class="px-4 py-3 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b28cc] to-[#8b5cf6] flex items-center justify-center text-white font-extrabold text-sm shadow">
                  {{ user.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm font-extrabold text-gray-900">{{ user.name }}</p>
                  <p class="text-xs text-gray-500 truncate max-w-[140px]">{{ user.email }}</p>
                </div>
              </div>
            </div>

            <!-- Menu items -->
            <div class="py-1.5">
              <button (click)="exportData()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span class="font-semibold">Exporter mes données</span>
                <span class="ml-auto text-[10px] font-bold text-gray-400 border border-gray-200 rounded px-1.5">RGPD</span>
              </button>
              <a routerLink="/privacy" (click)="closeUserMenu()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span class="font-semibold">Politique de confidentialité</span>
              </a>
            </div>

            <div class="border-t border-gray-100 py-1.5">
              <button (click)="logout()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="font-semibold">Se déconnecter</span>
              </button>
              <a routerLink="/profile" (click)="closeUserMenu()" class="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <span class="font-semibold">Mon profil &amp; sécurité</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Quick Task Modal -->
    <div *ngIf="showModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" (click)="closeModal()">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative" (click)="$event.stopPropagation()">
        <button (click)="closeModal()" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <h2 class="text-xl font-extrabold text-gray-900 mb-1">Nouvelle tâche</h2>
        <p class="text-sm text-gray-500 font-medium mb-6">Créez rapidement une tâche dans votre système.</p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Titre *</label>
            <input type="text" [(ngModel)]="form.title" placeholder="Ex: Corriger le bug d'authentification"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] transition-colors"
              autofocus>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea [(ngModel)]="form.description" rows="2" placeholder="Détails optionnels..."
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc] resize-none transition-colors"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Priorité</label>
              <select [(ngModel)]="form.priority" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                <option value="HIGH">🔴 Haute</option>
                <option value="MEDIUM">🟠 Moyenne</option>
                <option value="LOW">🟢 Faible</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
              <select [(ngModel)]="form.category" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
                <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Date limite</label>
            <input type="date" [(ngModel)]="form.deadline" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b28cc]/20 focus:border-[#3b28cc]">
          </div>
        </div>

        <div *ngIf="formError()" class="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{{ formError() }}</div>

        <div class="flex gap-3 mt-6">
          <button (click)="closeModal()" class="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
          <button (click)="save()" [disabled]="saving()"
            class="flex-1 py-3 bg-[#3b28cc] hover:bg-[#3222b0] text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <svg *ngIf="saving()" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            Créer la tâche
          </button>
        </div>
      </div>
    </div>
  `
})
export class TopbarComponent implements OnInit {
  auth = inject(AuthService);
  layout = inject(LayoutService);
  private taskService = inject(TaskService);
  private router = inject(Router);
  private notifService = inject(NotificationService);

  currentDate = '';
  weekNumber = 0;
  showModal = signal(false);
  showUserMenu = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  categories = CATEGORIES;

  form: TaskCreate = { title: '', description: '', priority: 'MEDIUM', category: 'Général', deadline: '' };

  searchQuery = '';
  
  notifications = signal<Notification[]>([]);
  showNotifications = signal(false);
  unreadCount = signal(0);

  ngOnInit() {
    const today = new Date();
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    this.currentDate = today.toLocaleDateString('fr-FR', opts).replace(/^\w/, c => c.toUpperCase());
    const start = new Date(today.getFullYear(), 0, 1);
    const days = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    this.weekNumber = Math.ceil((today.getDay() + 1 + days) / 7);

    this.loadNotifications();
  }

  loadNotifications() {
    this.notifService.getAll().subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.unreadCount.set(res.data.filter(n => !n.is_read).length);
      },
      error: () => {}
    });
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
  }

  markAsRead(id: number) {
    this.notifService.markAsRead(id).subscribe({
      next: () => this.loadNotifications()
    });
  }

  deleteNotif(id: number, event: Event) {
    event.stopPropagation();
    this.notifService.delete(id).subscribe({
      next: () => this.loadNotifications()
    });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/tasks'], { queryParams: { search: this.searchQuery.trim() } });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu.set(false);
    }
  }

  toggleUserMenu() { this.showUserMenu.set(!this.showUserMenu()); }
  closeUserMenu() { this.showUserMenu.set(false); }

  logout() {
    this.auth.logout();
    this.closeUserMenu();
  }

  exportData() {
    this.closeUserMenu();
    alert("Fonctionnalité d'exportation de données déclenchée (RGPD Article 20).");
  }

  deleteAccount() {
    this.closeUserMenu();
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes vos données (RGPD Article 17) ? Cette action est irréversible.")) {
      alert("Demande de suppression envoyée au serveur.");
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.form = { title: '', description: '', priority: 'MEDIUM', category: 'Général', deadline: '' };
    this.formError.set(null);
  }

  save() {
    if (!this.form.title.trim()) { this.formError.set('Le titre est requis.'); return; }
    this.saving.set(true);
    this.formError.set(null);
    this.taskService.create(this.form).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.router.navigate(['/tasks']); },
      error: () => { this.saving.set(false); this.formError.set('Une erreur est survenue.'); }
    });
  }
}
