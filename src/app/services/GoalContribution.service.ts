import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import {
  RegisterGoalContributionRequest,
  RegisterGoalContributionResponse
} from '../models/GoalContribution';

@Injectable({
  providedIn: 'root'
})
export class GoalContributionService {
  private apiUrl = `${environment.apiUrl}/contribution`;

  constructor(private http: HttpClient) {}

  registerContribution(request: RegisterGoalContributionRequest): Observable<RegisterGoalContributionResponse> {
    return this.http.post<RegisterGoalContributionResponse>(
      `${this.apiUrl}/register`,
      request
    );
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`);
  }

  getHistoryByDate(date: string): Observable<any[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<any[]>(`${this.apiUrl}/history/date`, { params });
  }

  getContributionsByGoalId(goalId: number): Observable<any[]> {
    console.log('GoalContributionService - Obteniendo contribuciones para goalId:', goalId);
    console.log('URL:', `${this.apiUrl}/goal/${goalId}`);
    return this.http.get<any[]>(`${this.apiUrl}/goal/${goalId}`);
  }

  deleteContribution(contributionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${contributionId}`);
  }
  getContributionsByUserId(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }
}
