import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SpendingLimitRequest,
  SpendingLimitResponse,
  SpendingLimitAlertResponse
} from '../models/SpendingLimit';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpendingLimitService {
  private apiUrl = `${environment.apiUrl}/spending-limit`;

  constructor(private http: HttpClient) {}

  createSpendingLimit(
    userId: number,
    request: SpendingLimitRequest
  ): Observable<SpendingLimitResponse> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<SpendingLimitResponse>(this.apiUrl, request, { params });
  }

  getSpendingLimitAlerts(userId: number): Observable<SpendingLimitAlertResponse[]> {
    return this.http.get<SpendingLimitAlertResponse[]>(
      `${this.apiUrl}/alerts`,
      { params: new HttpParams().set('userId', String(userId)) }
    );
  }

  listLimits(userId: number): Observable<SpendingLimitResponse[]> {
    const url = `${this.apiUrl}/${userId}`;
    return this.http.get<SpendingLimitResponse[]>(url);
  }

  deleteLimit(userId: number, categoryId: number): Observable<void> {
    const params = new HttpParams().set('userId', userId.toString()).set('categoryId', categoryId.toString());
    return this.http.delete<void>(this.apiUrl, { params });
  }

}
