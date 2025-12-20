import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AchievementDTO } from '../models/AchievementDTO';
import { UserAchievementDTO } from '../models/UserAchievementDTO';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AchievementService {
    private baseUrl = environment.apiUrl; // cambia esto si tu backend usa otra URL

  constructor(private http: HttpClient) {}

  getAllAchievements(): Observable<AchievementDTO[]> {
    return this.http.get<AchievementDTO[]>(`${this.baseUrl}/achievements`);
  }

  getUserAchievements(userId: number): Observable<UserAchievementDTO[]> {
    // Try different endpoint patterns that might exist in the backend
    return this.http.get<UserAchievementDTO[]>(`${this.baseUrl}/achievements/user/${userId}`);
  }

  // Alternative method to get user achievements with different endpoint
  getUserAchievementsAlternative(userId: number): Observable<UserAchievementDTO[]> {
    return this.http.get<UserAchievementDTO[]>(`${this.baseUrl}/users/${userId}/achievements`);
  }

  checkAchievements(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/check-achievements`, {});
  }

  // New method to refresh achievements after contributions
  refreshUserAchievements(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/refresh-achievements`, {});
  }

  // New method to sync unlocked achievements with backend
  syncAchievement(userId: number, achievementId: number, unlockedAt: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/achievements/${achievementId}/unlock`, {
      unlockedAt: unlockedAt
    });
  }
}
