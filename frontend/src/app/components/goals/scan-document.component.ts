import {
  Component, Output, EventEmitter, signal, HostListener, inject, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, switchMap, filter } from 'rxjs';
import { OcrService, OcrGoalData, OcrResult } from '../../services/ocr.service';
import { GoalCreate, GOAL_COLORS, CATEGORIES } from '../../models/task.model';

type ScanState = 'idle' | 'analyzing' | 'results' | 'error';

@Component({
  selector: 'app-scan-document',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="scan-backdrop" (click)="onBackdropClick($event)">
  <div class="scan-modal" id="scan-modal">

    <!-- Header -->
    <div class="scan-header">
      <div class="scan-header-left">
        <div class="scan-icon-wrap">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 9V5a2 2 0 012-2h4m0 0h6a2 2 0 012 2v4M7 3v4m10-4v4M3 15v4a2 2 0 002 2h4m6 0h2a2 2 0 002-2v-4M3 9h18M3 15h18"/>
          </svg>
        </div>
        <div>
          <h2 class="scan-title">Scanner un document</h2>
          <p class="scan-subtitle">L'IA extrait vos objectifs automatiquement</p>
        </div>
      </div>
      <button class="scan-close" (click)="onClose()">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- IDLE: Drop Zone -->
    <div class="scan-body" *ngIf="state() === 'idle'">
      <div
        class="drop-zone"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave()"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        id="drop-zone"
      >
        <input
          #fileInput
          type="file"
          accept="image/*"
          style="display:none"
          (change)="onFileSelected($event)"
        />

        <!-- Preview if image selected -->
        <div *ngIf="previewUrl(); else noPreview">
          <img [src]="previewUrl()" class="preview-img" alt="Aperçu document" />
          <p class="preview-hint">Cliquez pour changer l'image</p>
        </div>

        <ng-template #noPreview>
          <div class="drop-content">
            <div class="drop-icon">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <p class="drop-title">Glissez votre document ici</p>
            <p class="drop-sub">ou cliquez pour parcourir</p>
            <div class="drop-formats">
              <span>JPG</span><span>PNG</span><span>WEBP</span><span>HEIC</span>
            </div>
          </div>
        </ng-template>
      </div>

      <div class="scan-tips">
        <div class="tip-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Assurez-vous que le texte est lisible</span>
        </div>
        <div class="tip-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Documents d'évaluation, plans d'objectifs, fiches RH</span>
        </div>
        <div class="tip-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Maximum 10 Mo</span>
        </div>
      </div>

      <div class="scan-footer">
        <button class="btn-cancel-scan" (click)="onClose()">Annuler</button>
        <button
          class="btn-analyze"
          [disabled]="!selectedFile()"
          (click)="analyze()"
          id="btn-analyze"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Analyser avec l'IA
        </button>
      </div>
    </div>

    <!-- ANALYZING: Loader -->
    <div class="scan-body analyzing-body" *ngIf="state() === 'analyzing'">
      <div class="analyzing-wrap">
        <div class="ai-pulse">
          <div class="ai-ring"></div>
          <div class="ai-ring ring-2"></div>
          <div class="ai-ring ring-3"></div>
          <svg class="ai-brain" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>
          </svg>
        </div>
        <h3 class="analyzing-title">Analyse en cours…</h3>
        <p class="analyzing-sub">Gemini Vision lit votre document et extrait les objectifs</p>

        <!-- Elapsed timer -->
        <div class="analyzing-timer">
          <span class="timer-value">{{ elapsedSeconds() }}s</span>
          <span class="timer-label"> écoulée{{ elapsedSeconds() > 1 ? 's' : '' }}</span>
        </div>

        <!-- Patience hint for dense docs -->
        <p class="analyzing-hint" *ngIf="elapsedSeconds() >= 8">
          📄 Document dense détecté — le traitement peut prendre jusqu'à 45 secondes.
        </p>

        <div class="analyzing-steps">
          <div class="step-dot active"></div>
          <div class="step-dot" [class.active]="elapsedSeconds() >= 5"></div>
          <div class="step-dot" [class.active]="elapsedSeconds() >= 15"></div>
        </div>
      </div>
    </div>

    <!-- ERROR -->
    <div class="scan-body error-body" *ngIf="state() === 'error'">
      <div class="error-wrap">
        <div class="error-icon">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <h3 class="error-title">Analyse échouée</h3>
        <p class="error-msg">{{ errorMessage() }}</p>
        <button class="btn-retry" (click)="reset()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Réessayer
        </button>
      </div>
    </div>

    <!-- RESULTS -->
    <div class="scan-body results-body" *ngIf="state() === 'results' && ocrResult()">
      <div class="results-header">
        <div class="results-badge">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          {{ ocrResult()!.goals.length }} objectif(s) détecté(s)
        </div>
        <span class="results-doctype">{{ ocrResult()!.documentType }}</span>
      </div>

      <div class="goals-list">
        <div
          *ngFor="let goal of ocrResult()!.goals; let i = index"
          class="goal-preview-card"
          [class.selected-goal]="selectedGoalIndex() === i"
          (click)="selectGoal(i)"
          [id]="'goal-card-' + i"
        >
          <div class="goal-card-top">
            <div class="goal-color-dot" [style.background]="goal.color"></div>
            <div class="goal-card-info">
              <h4 class="goal-card-title">{{ goal.title }}</h4>
              <span class="goal-card-cat">{{ goal.category }}</span>
            </div>
            <div class="goal-check" [class.checked]="selectedGoalIndex() === i">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>

          <p class="goal-card-desc" *ngIf="goal.description">{{ goal.description }}</p>

          <div class="goal-card-actions" *ngIf="goal.actions?.length">
            <div class="actions-label">Actions détectées :</div>
            <ul class="actions-list">
              <li *ngFor="let action of goal.actions.slice(0, 3)">{{ action }}</li>
              <li *ngIf="goal.actions.length > 3" class="actions-more">+{{ goal.actions.length - 3 }} autres…</li>
            </ul>
          </div>

          <div class="goal-card-meta">
            <span class="meta-chip">🎯 Cible: {{ goal.annual_target }} tâches/an</span>
            <span class="meta-chip">📅 {{ ocrResult()!.year }}</span>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-cancel-scan" (click)="reset()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Rescanner
        </button>
        <button class="btn-import-all" (click)="importAll()" *ngIf="ocrResult()!.goals.length > 1" id="btn-import-all">
          Importer tout ({{ ocrResult()!.goals.length }})
        </button>
        <button
          class="btn-analyze"
          [disabled]="selectedGoalIndex() === null"
          (click)="importSelected()"
          id="btn-import-selected"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          {{ ocrResult()!.goals.length > 1 ? 'Importer sélectionné' : 'Importer cet objectif' }}
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
.scan-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

.scan-modal {
  background: #0f172a;
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
  animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
}

@keyframes slideUp {
  from { opacity:0; transform: translateY(30px) scale(0.96) }
  to   { opacity:1; transform: translateY(0) scale(1) }
}

/* Header */
.scan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.scan-header-left { display: flex; align-items: center; gap: 0.875rem; }
.scan-icon-wrap {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  flex-shrink: 0;
}
.scan-title { font-size: 1rem; font-weight: 600; color: #f1f5f9; margin: 0; }
.scan-subtitle { font-size: 0.75rem; color: #64748b; margin: 0.1rem 0 0; }
.scan-close {
  width: 32px; height: 32px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b;
  transition: all 0.2s;
}
.scan-close:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

/* Body */
.scan-body { padding: 1.5rem; }

/* Drop Zone */
.drop-zone {
  border: 2px dashed rgba(99,102,241,0.35);
  border-radius: 16px;
  background: rgba(99,102,241,0.04);
  cursor: pointer;
  min-height: 200px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.drop-zone:hover, .drag-over {
  border-color: #6366f1;
  background: rgba(99,102,241,0.1);
}
.drop-content { text-align: center; padding: 2rem; }
.drop-icon { color: #4f46e5; margin-bottom: 1rem; opacity: 0.8; }
.drop-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; margin: 0 0 0.25rem; }
.drop-sub { font-size: 0.8rem; color: #64748b; margin: 0 0 1rem; }
.drop-formats { display: flex; gap: 0.5rem; justify-content: center; }
.drop-formats span {
  font-size: 0.7rem;
  background: rgba(99,102,241,0.15);
  color: #818cf8;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

/* Preview */
.preview-img {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 10px;
  display: block;
  margin: 0 auto;
}
.preview-hint { font-size: 0.75rem; color: #64748b; text-align: center; margin: 0.5rem 0 0; }

/* Tips */
.scan-tips { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.4rem; }
.tip-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: #475569; }
.tip-item svg { color: #10b981; flex-shrink: 0; }

/* Footer */
.scan-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.btn-cancel-scan {
  padding: 0.6rem 1.25rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex; align-items: center; gap: 0.4rem;
  transition: all 0.2s;
}
.btn-cancel-scan:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
.btn-analyze {
  padding: 0.6rem 1.4rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(99,102,241,0.3);
}
.btn-analyze:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
.btn-analyze:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Analyzing */
.analyzing-body { display: flex; align-items: center; justify-content: center; min-height: 280px; }
.analyzing-wrap { text-align: center; }
.ai-pulse {
  position: relative;
  width: 90px; height: 90px;
  margin: 0 auto 1.5rem;
  display: flex; align-items: center; justify-content: center;
}
.ai-ring {
  position: absolute;
  width: 90px; height: 90px;
  border-radius: 50%;
  border: 2px solid rgba(99,102,241,0.4);
  animation: pulse-ring 1.8s ease-out infinite;
}
.ring-2 { animation-delay: 0.6s; }
.ring-3 { animation-delay: 1.2s; }
@keyframes pulse-ring {
  0% { transform: scale(0.5); opacity:1; }
  100% { transform: scale(1.4); opacity:0; }
}
.ai-brain { color: #6366f1; animation: brain-glow 2s ease-in-out infinite; }
@keyframes brain-glow {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(99,102,241,0.8)); }
  50% { filter: drop-shadow(0 0 18px rgba(139,92,246,1)); }
}
.analyzing-title { font-size: 1.1rem; font-weight: 600; color: #f1f5f9; margin: 0 0 0.4rem; }
.analyzing-sub { font-size: 0.8rem; color: #64748b; margin: 0 0 1.5rem; }
/* Timer */
.analyzing-timer {
  margin: 0.6rem 0 0.4rem;
  font-size: 0.8rem;
  color: #818cf8;
}
.timer-value { font-weight: 700; font-size: 1rem; }
.timer-label { color: #64748b; }

/* Dense doc hint */
.analyzing-hint {
  font-size: 0.75rem;
  color: #64748b;
  max-width: 300px;
  margin: 0 auto 0.75rem;
  line-height: 1.5;
  animation: fadeIn 0.4s ease;
}

/* Steps */
.analyzing-steps { display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.5rem; }
.step-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(99,102,241,0.2);
  animation: dot-bounce 1.4s ease-in-out infinite;
}
.step-dot.active { background: #6366f1; }
.step-dot:nth-child(2) { animation-delay: 0.2s; }
.step-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(1); }
  40% { transform: scale(1.4); }
}

/* Error */
.error-body { display: flex; align-items: center; justify-content: center; min-height: 220px; }
.error-wrap { text-align: center; }
.error-icon { color: #f43f5e; margin-bottom: 1rem; opacity: 0.8; }
.error-title { font-size: 1rem; font-weight: 600; color: #f1f5f9; margin: 0 0 0.5rem; }
.error-msg { font-size: 0.8rem; color: #64748b; margin: 0 0 1.5rem; max-width: 360px; }
.btn-retry {
  padding: 0.6rem 1.25rem;
  background: rgba(244,63,94,0.15);
  border: 1px solid rgba(244,63,94,0.3);
  border-radius: 10px;
  color: #f43f5e;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.5rem;
  transition: all 0.2s;
}
.btn-retry:hover { background: rgba(244,63,94,0.25); }

/* Results */
.results-body { }
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.results-badge {
  display: flex; align-items: center; gap: 0.4rem;
  background: rgba(16,185,129,0.15);
  border: 1px solid rgba(16,185,129,0.3);
  color: #10b981;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}
.results-badge svg { color: #10b981; }
.results-doctype { font-size: 0.75rem; color: #475569; font-style: italic; }

.goals-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 340px; overflow-y: auto; }

.goal-preview-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.goal-preview-card:hover { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.3); }
.selected-goal { background: rgba(99,102,241,0.1) !important; border-color: #6366f1 !important; }

.goal-card-top { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
.goal-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
.goal-card-info { flex: 1; }
.goal-card-title { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; margin: 0 0 0.2rem; }
.goal-card-cat {
  font-size: 0.7rem;
  background: rgba(99,102,241,0.15);
  color: #818cf8;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
.goal-check {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  color: transparent;
  flex-shrink: 0;
  transition: all 0.2s;
}
.goal-check.checked {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.goal-card-desc { font-size: 0.78rem; color: #64748b; margin: 0 0 0.75rem; line-height: 1.5; }

.goal-card-actions { margin-bottom: 0.75rem; }
.actions-label { font-size: 0.7rem; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
.actions-list { margin: 0; padding-left: 1rem; }
.actions-list li { font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.15rem; }
.actions-more { color: #4f46e5; font-style: italic; }

.goal-card-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.meta-chip {
  font-size: 0.7rem;
  background: rgba(255,255,255,0.05);
  color: #64748b;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.06);
}

.results-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-wrap: wrap;
}
.btn-import-all {
  padding: 0.6rem 1.25rem;
  background: rgba(16,185,129,0.15);
  border: 1px solid rgba(16,185,129,0.3);
  border-radius: 10px;
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-import-all:hover { background: rgba(16,185,129,0.25); }
  `]
})
export class ScanDocumentComponent implements OnDestroy {
  private ocrService = inject(OcrService);

  @Output() goalsImported = new EventEmitter<GoalCreate[]>();
  @Output() close = new EventEmitter<void>();

  state = signal<ScanState>('idle');
  isDragOver = signal(false);
  previewUrl = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  ocrResult = signal<OcrResult | null>(null);
  errorMessage = signal('');
  selectedGoalIndex = signal<number | null>(null);
  elapsedSeconds = signal(0);
  private timerRef: ReturnType<typeof setInterval> | null = null;
  private pollingSub: Subscription | null = null;

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('scan-backdrop')) {
      this.onClose();
    }
  }

  onClose() { this.close.emit(); }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() { this.isDragOver.set(false); }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  analyze() {
    const file = this.selectedFile();
    if (!file) return;

    this.state.set('analyzing');
    this.elapsedSeconds.set(0);
    this.timerRef = setInterval(() => this.elapsedSeconds.update(s => s + 1), 1000);

    // Step 1: submit the image and get a taskId immediately
    this.pollingSub = this.ocrService.submitDocument(file).pipe(
      switchMap(res => {
        console.log('[OCR] Task created:', res.taskId);
        // Step 2: poll for the result every 3s
        return this.ocrService.pollStatus(res.taskId);
      }),
      // Skip intermediate null emissions from pending state
      filter((result): result is OcrResult => result !== null && result !== undefined)
    ).subscribe({
      next: (result) => {
        this.stopAll();
        this.ocrResult.set(result);
        if (result.goals.length === 1) this.selectedGoalIndex.set(0);
        this.state.set('results');
      },
      error: (err) => {
        this.stopAll();
        const msg = err.error?.message || err.message || 'Erreur inconnue';
        this.errorMessage.set(msg);
        this.state.set('error');
      }
    });
  }

  private stopAll() {
    if (this.timerRef) { clearInterval(this.timerRef); this.timerRef = null; }
    if (this.pollingSub) { this.pollingSub.unsubscribe(); this.pollingSub = null; }
  }

  ngOnDestroy() { this.stopAll(); }

  selectGoal(index: number) {
    this.selectedGoalIndex.set(index === this.selectedGoalIndex() ? null : index);
  }

  importSelected() {
    const result = this.ocrResult();
    const idx = this.selectedGoalIndex();
    if (!result || idx === null) return;
    const goal = result.goals[idx];
    this.goalsImported.emit([this.toGoalCreate(goal, result.year)]);
  }

  importAll() {
    const result = this.ocrResult();
    if (!result) return;
    const goals = result.goals.map(g => this.toGoalCreate(g, result.year));
    this.goalsImported.emit(goals);
  }

  private toGoalCreate(goal: OcrGoalData, year: number): GoalCreate {
    return {
      title: goal.title,
      category: goal.category || 'Général',
      annual_target: goal.annual_target || 52,
      year: year || new Date().getFullYear(),
      color: goal.color || '#6366f1',
      description: goal.description || ''
    };
  }

  reset() {
    this.stopAll();
    this.state.set('idle');
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    this.ocrResult.set(null);
    this.selectedGoalIndex.set(null);
    this.errorMessage.set('');
    this.elapsedSeconds.set(0);
  }
}
