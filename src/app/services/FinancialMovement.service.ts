import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of } from 'rxjs';
import {
  RegisterFinancialMovementRequest,
  RegisterFinancialMovementResponse,
  TransactionResponse,
} from '../models/FinancialMovement';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FinancialMovementService {
  private apiUrl = `${environment.apiUrl}/movements`;

  // Shared state for transactions
  private transactionsSubject = new BehaviorSubject<TransactionResponse[]>([]);
  public transactions$ = this.transactionsSubject.asObservable();

  // Cache to avoid unnecessary API calls
  private transactionsCache = new Map<number, TransactionResponse[]>();
  private lastFetchTime = 0;
  private cacheDuration = 60000; // 1 minute cache duration

  constructor(private http: HttpClient) {}

  // Get transactions from the shared state
  getTransactions(): Observable<TransactionResponse[]> {
    return this.transactions$;
  }

  // Refresh transactions from the API and update the shared state
  refreshTransactions(userId: number, type?: string, categoryId?: number): Observable<TransactionResponse[]> {
    return this.fetchMovements(userId, type, categoryId).pipe(
      tap(transactions => {
        this.transactionsSubject.next(transactions);
        this.transactionsCache.set(userId, transactions);
        this.lastFetchTime = Date.now();
      })
    );
  }

  // Get movements with caching
  getMovements(userId: number, type?: string, categoryId?: number): Observable<TransactionResponse[]> {
    // Check if we have a recent cache
    const now = Date.now();
    if (this.transactionsCache.has(userId) && (now - this.lastFetchTime < this.cacheDuration)) {
      const cachedData = this.transactionsCache.get(userId) || [];
      this.transactionsSubject.next(cachedData);
      return of(cachedData);
    }

    // If no cache or cache expired, fetch from API
    return this.refreshTransactions(userId, type, categoryId);
  }

  // Actual API call method
  private fetchMovements(userId: number, type?: string, categoryId?: number): Observable<TransactionResponse[]> {
    let params = new HttpParams();

    if (type && type.trim() !== '') {
      params = params.set('type', type);
    }

    if (categoryId !== undefined && categoryId !== 0) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get<TransactionResponse[]>(`${this.apiUrl}/${userId}`, { params });
  }

  // Register a new movement and update the shared state
  register(userId: number, request: RegisterFinancialMovementRequest): Observable<RegisterFinancialMovementResponse> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.post<RegisterFinancialMovementResponse>(`${this.apiUrl}/register`, request, { params })
      .pipe(
        tap(() => {
          // After successful registration, refresh the transactions
          this.refreshTransactions(userId).subscribe();
        })
      );
  }

  filter(userId: number, categoryId: number | null, type: string | null): Observable<RegisterFinancialMovementResponse[]> {
    let params = new HttpParams().set('userId', userId.toString());
    if (categoryId !== null) params = params.set('categoryId', categoryId.toString());
    if (type) params = params.set('type', type);

    return this.http.get<RegisterFinancialMovementResponse[]>(`${this.apiUrl}/filter`, { params });
  }

  uploadExcel(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData, { responseType: 'text' });
  }
}
