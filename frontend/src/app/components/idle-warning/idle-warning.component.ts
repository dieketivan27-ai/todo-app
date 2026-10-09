import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IdleService } from '../../services/idle.service';

@Component({
  selector: 'app-idle-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="idleService.showWarning" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4 animate-slide-up border border-gray-100">
        <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h3 class="text-lg font-bold text-gray-900">Inactivité détectée</h3>
        
        <p class="text-sm text-gray-600">
          Pour votre sécurité, vous allez être déconnecté dans 
          <strong class="text-red-500 text-lg">{{ idleService.warningCountdown }}s</strong>.
        </p>
        
        <button 
          (click)="idleService.stayConnected()"
          class="w-full mt-4 btn-primary justify-center font-bold">
          Rester connecté
        </button>
      </div>
    </div>
  `
})
export class IdleWarningComponent {
  idleService = inject(IdleService);
}
