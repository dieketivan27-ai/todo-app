import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

const IDLE_TIMEOUT_MS = environment.IDLE_TIMEOUT_MS;
const IDLE_WARNING_MS = environment.IDLE_WARNING_MS;
const LAST_ACTIVITY_KEY = 'idle_last_activity';
const LOGOUT_BROADCAST_KEY = 'idle_logout_event';

@Injectable({ providedIn: 'root' })
export class IdleService implements OnDestroy {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastThrottledUpdate = 0;
  private running = false;

  /** Indique si le modal d'avertissement doit être affiché */
  showWarning = false;
  /** Compte à rebours en secondes affiché dans le modal */
  warningCountdown = 0;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly activityEvents = [
    'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'
  ] as const;

  private boundOnActivity!: () => void;
  private boundOnVisibility!: () => void;
  private boundOnStorage!: (e: StorageEvent) => void;

  constructor(private ngZone: NgZone, private router: Router) {}

  /** Démarre la surveillance d'inactivité */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Enregistre l'heure initiale si absente
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      this.updateLastActivity();
    }

    this.boundOnActivity = () => this.onActivity();
    this.boundOnVisibility = () => this.onVisibilityChange();
    this.boundOnStorage = (e: StorageEvent) => this.onStorage(e);

    // Écoute hors zone Angular pour ne pas déclencher la détection à chaque event
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach(evt =>
        document.addEventListener(evt, this.boundOnActivity, { passive: true })
      );
      document.addEventListener('visibilitychange', this.boundOnVisibility);
      window.addEventListener('storage', this.boundOnStorage);
    });

    this.scheduleTimers();

    // Tick toutes les secondes pour vérifier l'expiration côté mobile/background
    this.ngZone.runOutsideAngular(() => {
      this.tickInterval = setInterval(() => this.tick(), 1000);
    });
  }

  /** Arrête la surveillance et nettoie tout */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.activityEvents.forEach(evt =>
      document.removeEventListener(evt, this.boundOnActivity)
    );
    document.removeEventListener('visibilitychange', this.boundOnVisibility);
    window.removeEventListener('storage', this.boundOnStorage);

    this.clearTimers();
    this.hideWarning();
  }

  /** Appelé par le bouton "Rester connecté" */
  stayConnected(): void {
    this.updateLastActivity();
    this.hideWarning();
    this.scheduleTimers();
  }

  // ─── Privé ───────────────────────────────────────────────────────────────

  private onActivity(): void {
    const now = Date.now();
    if (now - this.lastThrottledUpdate < 1000) return; // throttle 1 s
    this.lastThrottledUpdate = now;
    this.updateLastActivity();
    this.scheduleTimers();
    if (this.showWarning) {
      this.ngZone.run(() => this.hideWarning());
    }
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.tick();
    }
  }

  private onStorage(e: StorageEvent): void {
    if (e.key === LOGOUT_BROADCAST_KEY) {
      // Déconnexion déclenchée dans un autre onglet
      this.ngZone.run(() => this.performLogout(true));
    } else if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
      // Activité dans un autre onglet → réinitialise les timers
      this.scheduleTimers();
      if (this.showWarning) {
        this.ngZone.run(() => this.hideWarning());
      }
    }
  }

  private tick(): void {
    if (!this.running) return;
    const elapsed = Date.now() - this.getLastActivity();
    if (elapsed >= IDLE_TIMEOUT_MS) {
      this.ngZone.run(() => this.performLogout(false));
    } else if (elapsed >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS && !this.showWarning) {
      this.ngZone.run(() => this.displayWarning(IDLE_TIMEOUT_MS - elapsed));
    }
  }

  private scheduleTimers(): void {
    this.clearTimers();
    const remaining = IDLE_TIMEOUT_MS - (Date.now() - this.getLastActivity());
    if (remaining <= 0) {
      this.performLogout(false);
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const warningDelay = remaining - IDLE_WARNING_MS;

      if (warningDelay > 0) {
        this.warningTimer = setTimeout(() => {
          this.ngZone.run(() => this.displayWarning(IDLE_WARNING_MS));
        }, warningDelay);
      } else {
        // Déjà dans la fenêtre d'avertissement
        this.ngZone.run(() => this.displayWarning(remaining));
      }

      this.idleTimer = setTimeout(() => {
        this.ngZone.run(() => this.performLogout(false));
      }, remaining);
    });
  }

  private displayWarning(remainingMs: number): void {
    this.showWarning = true;
    this.warningCountdown = Math.ceil(remainingMs / 1000);

    this.clearCountdown();
    this.countdownInterval = setInterval(() => {
      this.warningCountdown--;
      if (this.warningCountdown <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  private hideWarning(): void {
    this.showWarning = false;
    this.warningCountdown = 0;
    this.clearCountdown();
  }

  private clearCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private clearTimers(): void {
    if (this.idleTimer !== null) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.warningTimer !== null) { clearTimeout(this.warningTimer); this.warningTimer = null; }
    if (this.tickInterval !== null) { clearInterval(this.tickInterval); this.tickInterval = null; }
    this.clearCountdown();
  }

  private updateLastActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }

  private getLastActivity(): number {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
  }

  /** Déconnexion propre : logout API → clear state → redirect /login */
  performLogout(crossTab: boolean): void {
    if (!this.running && !crossTab) return;
    this.stop();

    // Signale aux autres onglets
    if (!crossTab) {
      localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
      setTimeout(() => localStorage.removeItem(LOGOUT_BROADCAST_KEY), 500);
    }
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    // Appel API logout pour effacer le cookie HttpOnly côté serveur
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .catch(() => { /* ignore */ })
      .finally(() => {
        this.router.navigate(['/login'], {
          queryParams: { reason: 'session_expired' }
        });
      });
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
