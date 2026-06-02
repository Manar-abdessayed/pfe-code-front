import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminStats {
  totalUsers: number;
  totalPositions: number;
  totalPortfolioValue: number;
  totalInstruments: number;
  newUsersThisWeek?: number;
  avgResponseTime?: number;
  userGrowthPercent?: number;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  riskLevel: number;
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  availableCapital: number;
  positionCount: number;
  portfolioValue: number;
  createdAt?: string;
  lastActivityAt?: string;
}

export interface AdminUserPosition {
  symbol: string;
  companyName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPct: number;
  sector: string;
  assetClass: string;
  purchaseDate: string;
}

export interface AdminUserDetail extends AdminUser {
  gainLoss: number;
  gainLossPct: number;
  conversationCount: number;
  sectors: string[];
  positions: AdminUserPosition[];
}

export interface AdminAlert {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  category: string;
  time: string;
}

export interface ActiveUserPoint {
  hour: string;
  value: number;
}

export interface RegistrationPoint {
  day: string;
  count: number;
}

export interface RiskSegment {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SystemServiceStatus {
  name: string;
  status: 'ok' | 'warning' | 'error';
  latency?: number;
  detail: string;
  lastCheck?: string;
}

export interface AdminConfig {
  marketDataRefreshInterval: number;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  emailNotificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  defaultRiskLevel: number;
  maintenanceMode: boolean;
  logLevel: string;
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

  searchUsers(query: string, riskFilter?: string): Observable<AdminUser[]> {
    let params = new HttpParams();
    if (query) params = params.set('search', query);
    if (riskFilter) params = params.set('risk', riskFilter);
    return this.http.get<AdminUser[]>(`${this.api}/users`, { params });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }

  getAlerts(): Observable<AdminAlert[]> {
    return this.http.get<AdminAlert[]>(`${this.api}/alerts`);
  }

  getActiveUsers(): Observable<ActiveUserPoint[]> {
    return this.http.get<ActiveUserPoint[]>(`${this.api}/active-users`);
  }

  getUserDetails(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.api}/users/${id}/details`);
  }

  getRegistrationTrend(): Observable<RegistrationPoint[]> {
    return this.http.get<RegistrationPoint[]>(`${this.api}/registration-trend`);
  }

  getRiskDistribution(): Observable<RiskSegment[]> {
    return this.http.get<RiskSegment[]>(`${this.api}/risk-distribution`);
  }

  getSystemServices(): Observable<SystemServiceStatus[]> {
    return this.http.get<SystemServiceStatus[]>(`${this.api}/system-services`);
  }

  getConfig(): Observable<AdminConfig> {
    return this.http.get<AdminConfig>(`${this.api}/config`);
  }

  updateConfig(config: Partial<AdminConfig>): Observable<AdminConfig> {
    return this.http.put<AdminConfig>(`${this.api}/config`, config);
  }
}
