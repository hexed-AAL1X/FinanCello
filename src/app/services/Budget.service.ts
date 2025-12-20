import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BudgetRequest, BudgetResponse } from '../models/Budget';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private apiUrl = `${environment.apiUrl}/budgets`;
  private http = inject(HttpClient);

  constructor() {}

  createBudget(request: BudgetRequest): Observable<BudgetResponse> {
    return this.http.post<BudgetResponse>(`${this.apiUrl}/create`, request);
  }
}



/*
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BudgetRequest, BudgetResponse } from '../models/Budget';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private readonly STORAGE_KEY = 'budget';
  private budgetSubject = new BehaviorSubject<BudgetResponse | null>(null);
  currentBudget$: Observable<BudgetResponse | null> = this.budgetSubject.asObservable();

  constructor() {
    this.loadBudget();
  }

  saveBudget(request: BudgetRequest): boolean {
    try {
      const budget: BudgetResponse = {
        id: Date.now(),
        period: request.period,
        totalIncomePlanned: request.totalIncomePlanned,
        totalOutcomePlanned: request.totalOutcomePlanned,
        userId: request.userId,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(budget));
      this.budgetSubject.next(budget);
      return true;
    } catch (error) {
      console.error('Error saving budget:', error);
      return false;
    }
  }

  private loadBudget(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return;

      const parsedData = JSON.parse(data) as BudgetResponse;
      this.validateBudgetData(parsedData);
      this.budgetSubject.next(parsedData);
    } catch (error) {
      console.error('Error loading budget:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private validateBudgetData(data: BudgetResponse): void {
    const requiredFields: (keyof BudgetResponse)[] = ['id', 'period', 'totalIncomePlanned', 'totalOutcomePlanned', 'userId'];

    for (const field of requiredFields) {
      if (data[field] === undefined) {
        throw new Error(`Invalid budget data: missing ${field}`);
      }
    }

    if (data.totalIncomePlanned < 0 || data.totalOutcomePlanned < 0) {
      throw new Error('Invalid budget data: amounts cannot be negative');
    }
  }

}

*/