import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserSettings {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  emailNotifications: boolean;
  marketAlerts: boolean;
  portfolioAlerts: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = 'http://localhost:8080/api/settings';

  constructor(private readonly http: HttpClient) {}

  getSettings(userId: string): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.api}/${userId}`);
  }

  updateProfile(userId: string, data: Partial<UserSettings>): Observable<UserSettings> {
    return this.http.put<UserSettings>(`${this.api}/${userId}/profile`, data);
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/${userId}/password`, { currentPassword, newPassword });
  }

  updateNotifications(userId: string, prefs: { emailNotifications: boolean; marketAlerts: boolean; portfolioAlerts: boolean }): Observable<any> {
    return this.http.put(`${this.api}/${userId}/notifications`, prefs);
  }
}
