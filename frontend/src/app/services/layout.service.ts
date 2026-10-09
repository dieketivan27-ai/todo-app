import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.updateBodyScroll();
  }

  closeSidebar() {
    if (this.sidebarOpen()) {
      this.sidebarOpen.set(false);
      this.updateBodyScroll();
    }
  }

  private updateBodyScroll() {
    if (this.sidebarOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}
