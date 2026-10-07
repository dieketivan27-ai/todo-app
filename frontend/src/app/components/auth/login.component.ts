import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4">
      <!-- Decorative blobs -->
      <div class="fixed top-0 right-0 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      <div class="fixed bottom-0 left-0 w-72 h-72 bg-indigo-100 rounded-full filter blur-3xl opacity-40 translate-y-1/2 -translate-x-1/2"></div>
      
      <div class="relative max-w-md w-full space-y-8 p-6 sm:p-10 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl">
        <!-- Logo -->
        <div class="flex flex-col items-center">
          <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Bon retour ! 👋</h2>
          <p class="mt-1 text-sm text-gray-500">Connectez-vous pour accéder à vos objectifs</p>
        </div>
        
        <form class="mt-8 space-y-5" (ngSubmit)="onSubmit()">
          <div class="space-y-4">
            <div>
              <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">Adresse Email</label>
              <input id="email-address" name="email" type="email" autocomplete="email" required [(ngModel)]="credentials.email"
                class="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all sm:text-sm"
                placeholder="vous@email.com">
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required [(ngModel)]="credentials.password"
                class="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all sm:text-sm"
                placeholder="••••••••">
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
              Connexion...
            </span>
            <span *ngIf="!loading()">Se connecter →</span>
          </button>
        </form>
        
        <div class="text-center mt-6">
          <p class="text-sm text-gray-500">
            Pas encore de compte ? 
            <a routerLink="/register" class="font-semibold text-blue-600 hover:text-blue-700">Créer un compte</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = { email: '', password: '' };
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (!this.credentials.email || !this.credentials.password) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur de connexion');
      }
    });
  }
}
