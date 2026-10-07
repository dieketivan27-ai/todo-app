import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4">
      <div class="fixed top-0 right-0 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      <div class="fixed bottom-0 left-0 w-72 h-72 bg-indigo-100 rounded-full filter blur-3xl opacity-40 translate-y-1/2 -translate-x-1/2"></div>

      <div class="relative max-w-md w-full space-y-8 p-6 sm:p-10 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl">
        <div class="flex flex-col items-center">
          <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Créer un compte 🚀</h2>
          <p class="mt-1 text-sm text-gray-500">Commencez à organiser vos objectifs dès aujourd'hui</p>
        </div>
        
        <form class="mt-8 space-y-5" (ngSubmit)="onSubmit()">
          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input id="name" name="name" type="text" required [(ngModel)]="userData.name"
                class="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all sm:text-sm"
                placeholder="Jean Dupont">
            </div>
            <div>
              <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">Adresse Email</label>
              <input id="email-address" name="email" type="email" autocomplete="email" required [(ngModel)]="userData.email"
                class="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all sm:text-sm"
                placeholder="vous@email.com">
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input id="password" name="password" type="password" required [(ngModel)]="userData.password"
                class="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all sm:text-sm"
                placeholder="Au moins 8 caractères">
            </div>
          </div>

          <div *ngIf="error()" class="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ error() }}
          </div>

          <button type="submit" [disabled]="loading()"
            class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg disabled:opacity-70">
            <span *ngIf="loading()" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              Création...
            </span>
            <span *ngIf="!loading()">Créer mon compte →</span>
          </button>
        </form>
        
        <div class="text-center mt-6">
          <p class="text-sm text-gray-500">
            Déjà un compte ? 
            <a routerLink="/login" class="font-semibold text-blue-600 hover:text-blue-700">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userData = { name: '', email: '', password: '' };
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (!this.userData.name || !this.userData.email || !this.userData.password) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    this.authService.register(this.userData).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur lors de l\'inscription');
      }
    });
  }
}
