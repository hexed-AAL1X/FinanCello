import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AddSavingGoalRequest,
  UpdateSavingGoalRequest,
  AddSavingGoalResponse,
  UserGoalsWithContributionsResponse,
} from '../models/SavingGoal';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SavingGoalService {
  private apiUrl = `${environment.apiUrl}/goals`;

  constructor(private http: HttpClient) {}

  // Obtener el userId del localStorage
  private getUserId(): number {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
    throw new Error('Usuario no autenticado');
  }

  addSavingGoal(
    request: AddSavingGoalRequest
  ): Observable<AddSavingGoalResponse> {
    const userId = this.getUserId();
    const params = new HttpParams().set('userId', userId);
    
    return this.http.post<AddSavingGoalResponse>(
      `${this.apiUrl}/add`,
      request,
      { params }
    );
  }

  updateSavingGoal(goalId: number, request: UpdateSavingGoalRequest): Observable<AddSavingGoalResponse> {
    return this.http.put<AddSavingGoalResponse>(
      `${this.apiUrl}/${goalId}`,
      request
    );
  }

  deleteSavingGoal(goalId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${goalId}`
    );
  }

  listSavingGoals(): Observable<AddSavingGoalResponse[]> {
    const userId = this.getUserId();
    const params = new HttpParams().set('userId', userId);
    
    return this.http.get<AddSavingGoalResponse[]>(
      `${this.apiUrl}/user`,
      { params }
    );
  }

  getGoalsByUser(userId: number): Observable<AddSavingGoalResponse[]> {
    return this.http.get<AddSavingGoalResponse[]>(
      `${this.apiUrl}/user`,
      { params: { userId } }
    );
  }

  getUserGoalsWithContributions(userId: number): Observable<UserGoalsWithContributionsResponse[]> {
    return this.http.get<UserGoalsWithContributionsResponse[]>(
      `${this.apiUrl}/user/${userId}/contributions`
    );
  }
}