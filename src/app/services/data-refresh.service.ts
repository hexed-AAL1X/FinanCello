import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RefreshEvent {
  type: 'savingGoals' | 'contributions' | 'movements' | 'categories' | 'achievements' | 'all';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DataRefreshService {
  private refreshSubject = new BehaviorSubject<RefreshEvent | null>(null);
  public refresh$ = this.refreshSubject.asObservable();

  constructor() {}

  // Método para notificar que se necesita refrescar datos
  triggerRefresh(type: RefreshEvent['type'] = 'all') {
    const event: RefreshEvent = {
      type,
      timestamp: new Date()
    };
    this.refreshSubject.next(event);
    console.log(`DataRefreshService: Triggering refresh for ${type}`);
  }

  // Método para obtener el observable de refresco
  getRefreshObservable(): Observable<RefreshEvent | null> {
    return this.refresh$;
  }

  // Métodos específicos para diferentes tipos de datos
  refreshSavingGoals() {
    this.triggerRefresh('savingGoals');
  }

  refreshContributions() {
    this.triggerRefresh('contributions');
  }

  refreshMovements() {
    this.triggerRefresh('movements');
  }

  refreshCategories() {
    this.triggerRefresh('categories');
  }

  refreshAchievements() {
    this.triggerRefresh('achievements');
  }

  refreshAll() {
    this.triggerRefresh('all');
  }
} 