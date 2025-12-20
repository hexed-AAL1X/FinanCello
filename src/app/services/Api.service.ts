import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    get<T>(endpoint: string): Observable<T> {
        return this.http.get<T>(`${this.baseUrl}${endpoint}`);
    }

    getPage<T>(
        endpoint: string,
        page: number = 0,
        size: number = 10
    ): Observable<any> {
        return this.http.get<T>(
            `${this.baseUrl}${endpoint}?page=${page}&size=${size}`
        );
    }

    post<T>(endpoint: string, data: any): Observable<T> {
        return this.http.post<T>(`${this.baseUrl}${endpoint}`, data);
    }

    put<T>(endpoint: string, data: any): Observable<T> {
        return this.http.put<T>(`${this.baseUrl}${endpoint}`, data);
    }

    delete(endpoint: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}${endpoint}`);
    }

    patch<T>(endpoint: string, data: any): Observable<T> {
        return this.http.patch<T>(`${this.baseUrl}${endpoint}`, data);
    }
}
