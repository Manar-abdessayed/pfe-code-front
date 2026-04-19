import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminStats {
  totalUsers: number;
  totalPositions: number;
  totalPortfolioValue: number;
  totalInstruments: number;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  riskLevel: number;
  investmentGoal: string;
  investmentHorizon: string;
  availableCapital: number;
  positionCount: number;
  portfolioValue: number;
}

export interface AdminAlert {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  category: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = 'http://localhost:8080/api/admin';

  constructor(private readonly http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/stats`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/users`);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }

  getAlerts(): Observable<AdminAlert[]> {
    return this.http.get<AdminAlert[]>(`${this.api}/alerts`);
  }
}
