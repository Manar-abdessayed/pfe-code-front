import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  riskLevel: number;
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  availableCapital: number;
  sectors: string[];
}

export interface UpdateProfileRequest {
  riskLevel?: number;
  investmentGoal?: string;
  investmentHorizon?: string;
  availableCapital?: number;
  sectors?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiUrl = 'http://localhost:8080/api/profile';

  constructor(private readonly http: HttpClient) {}

  getProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`);
  }

  updateProfile(userId: string, data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/${userId}`, data);
  }
}
