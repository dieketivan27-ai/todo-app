import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      <!-- Sidebar fixe -->
      <app-sidebar></app-sidebar>

      <!-- Contenu principal (décalé pour la sidebar) -->
      <div class="flex-1 ml-64 flex flex-col min-h-screen">
        <!-- Topbar fixe -->
        <app-topbar></app-topbar>

        <!-- Page dynamique -->
        <main class="flex-1 p-8 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
        
        <!-- Footer premium -->
        <footer class="mt-auto px-8 py-6 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
          <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              <span>FocusFlow respecte votre vie privée. Données sécurisées.</span>
            </div>
            
            <div class="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 text-xs font-semibold">
              <a routerLink="/privacy" class="text-gray-500 hover:text-[#3b28cc] transition-colors flex items-center gap-1">
                Politique de confidentialité
              </a>
              <a routerLink="/terms" class="text-gray-500 hover:text-[#3b28cc] transition-colors flex items-center gap-1">
                Conditions Générales
              </a>
              <div class="w-px h-3 bg-gray-300 hidden md:block"></div>
              <button (click)="exportData()" class="text-gray-500 hover:text-[#3b28cc] transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Exporter mes données
              </button>
              <button (click)="deleteAccount()" class="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Supprimer mon compte
              </button>
            </div>
          </div>
        </footer>
      </div>

      <!-- Cookie Consent Banner -->
      <div *ngIf="showCookieBanner()" class="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between">
        <div class="flex-1 max-w-4xl">
          <h4 class="font-bold text-gray-900 text-sm mb-1">Respect de votre vie privée</h4>
          <p class="text-xs text-gray-500">Nous utilisons des cookies strictement nécessaires (session sécurisée) pour faire fonctionner l'application. Aucun traceur publicitaire n'est utilisé. <a routerLink="/privacy" class="text-[#3b28cc] hover:underline">En savoir plus</a>.</p>
        </div>
        <div class="flex gap-2 ml-4">
          <button (click)="acceptCookies()" class="bg-[#3b28cc] hover:bg-[#3222b0] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">J'ai compris et j'accepte</button>
        </div>
      </div>
    </div>
  `
})
export class LayoutComponent {
  showCookieBanner = () => !localStorage.getItem('cookie_consent');

  acceptCookies() {
    localStorage.setItem('cookie_consent', 'true');
  }

  exportData() {
    alert("Fonctionnalité d'exportation de données déclenchée (RGPD Article 20).");
  }

  deleteAccount() {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes vos données (RGPD Article 17) ? Cette action est irréversible.")) {
      alert("Demande de suppression envoyée au serveur.");
    }
  }
}
