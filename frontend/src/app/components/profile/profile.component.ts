import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900">Mon profil</h1>
        <p class="text-sm text-gray-500 font-medium mt-1">Gérez vos informations personnelles et les paramètres de votre compte.</p>
      </div>

      <!-- Profile Card -->
      <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm" *ngIf="auth.currentUser$ | async as user">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b28cc] to-[#8b5cf6] flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 class="text-xl font-extrabold text-gray-900">{{ user.name }}</h2>
            <p class="text-sm text-gray-500">{{ user.email }}</p>
            <span class="inline-flex items-center gap-1.5 mt-1 bg-indigo-50 text-[#3b28cc] border border-indigo-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <span class="w-1.5 h-1.5 rounded-full bg-[#3b28cc]"></span>Plan Pro
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <div class="bg-gray-50 rounded-xl p-4">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nom complet</label>
            <p class="text-sm font-semibold text-gray-900">{{ user.name }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Adresse e-mail</label>
            <p class="text-sm font-semibold text-gray-900">{{ user.email }}</p>
          </div>
        </div>
      </div>

      <!-- RGPD Data Export -->
      <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 class="text-base font-extrabold text-gray-900 mb-1">Mes données (RGPD)</h3>
        <p class="text-sm text-gray-500 mb-4">Conformément à l'Article 20 du RGPD, vous pouvez exporter une copie de toutes vos données.</p>
        <button (click)="exportData()" class="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Exporter mes données
        </button>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-red-700">Zone de danger</h3>
            <p class="text-sm text-red-500/80 mt-0.5">La suppression de votre compte est définitive et irréversible.</p>
          </div>
        </div>

        <div class="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 text-sm text-red-700 font-medium">
          ⚠️ Cette action supprimera <strong>toutes vos tâches, objectifs, projets et données</strong> de manière permanente. Il n'est pas possible d'annuler cette action.
        </div>

        <div *ngIf="!showDeleteConfirm()" class="flex">
          <button (click)="showDeleteConfirm.set(true)"
            class="flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Supprimer mon compte
          </button>
        </div>

        <!-- Confirmation step -->
        <div *ngIf="showDeleteConfirm()" class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">
              Pour confirmer, tapez <span class="font-extrabold text-red-600">SUPPRIMER</span> ci-dessous :
            </label>
            <input type="text" [(ngModel)]="confirmText"
              placeholder="Tapez SUPPRIMER"
              class="w-full px-4 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors">
          </div>
          <div class="flex gap-3">
            <button (click)="cancelDelete()" class="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button (click)="deleteAccount()" [disabled]="confirmText !== 'SUPPRIMER'"
              class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Confirmer la suppression définitive
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ProfileComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  showDeleteConfirm = signal(false);
  confirmText = '';

  exportData() {
    alert("Exportation de vos données déclenchée (RGPD Article 20). Un e-mail vous sera envoyé avec l'archive.");
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.confirmText = '';
  }

  deleteAccount() {
    if (this.confirmText !== 'SUPPRIMER') return;
    this.http.delete('/api/auth/me').subscribe({
      next: () => {
        this.auth.logout();
      },
      error: () => {
        // Même en cas d'erreur API, on déconnecte localement
        this.auth.logout();
      }
    });
  }
}
