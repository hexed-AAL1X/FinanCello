import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserProfileResponse,
  UpdateProfileRequest,
  UserWithRoleResponse,
} from '../models/User';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);

  constructor() {}

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/register`,
      request
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      request
    );
  }

  getUserProfile(userId: number): Observable<UserProfileResponse> {
    // si tu controlador mapea GET /auth/profile/{userId}
    return this.http.get<UserProfileResponse>(
      `${this.apiUrl}/profile/${userId}`
    );
  }

  updateUserProfile(
    userId: number,
    request: UpdateProfileRequest
  ): Observable<UserProfileResponse> {
    // si tu controlador mapea PUT /auth/profile/{userId}
    return this.http.put<UserProfileResponse>(
      `${this.apiUrl}/profile/${userId}`,
      request
    );
  }

  getAllUsers(): Observable<UserWithRoleResponse[]> {
    // si tu controlador tiene GET /users
    return this.http.get<UserWithRoleResponse[]>(`${environment.apiUrl}/users`);
  }
}
