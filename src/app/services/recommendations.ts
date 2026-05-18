import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recommendation {
  id: string;
  isin: string;
  symbol: string;
  companyName: string;
  action: 'ACHAT' | 'VENTE' | 'CONSERVER';
  analysisType: string;
  currentPrice: number;
  targetPrice: number;
  confidence: number;
  rationale: string;
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  rsi: number;
  macd: number;
  volatility: number;
  signalRsi: string;
  signalMacd: string;
  signalBb: string;
  createdAt: string;
  active: boolean;
}

export interface GenerateRequest {
  userId: string;
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  availableCapital: number;
  sectors: string[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly api = 'http://localhost:8080/api/recommendations';

  constructor(private readonly http: HttpClient) {}

  getRecommendations(filter: string = 'all'): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`${this.api}?filter=${filter}`);
  }

  generate(): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.api}/generate`, {});
  }

  saveBatch(recs: Recommendation[]): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.api}/save-batch`, recs);
  }
}
