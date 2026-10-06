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
        
        <!-- Footer simple -->
        <footer class="p-4 text-center text-xs text-gray-400">
          <a routerLink="/privacy" class="hover:text-gray-600 transition-colors mx-2">Politique de confidentialité</a> | 
          <a routerLink="/terms" class="hover:text-gray-600 transition-colors mx-2">CGU</a> | 
          <button (click)="exportData()" class="hover:text-[#3b28cc] transition-colors mx-2">Exporter mes données</button> |
          <button (click)="deleteAccount()" class="hover:text-red-500 transition-colors mx-2">Supprimer le compte</button>
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
