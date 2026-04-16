import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = 'http://localhost:8080/api/dashboard';

  constructor(private http: HttpClient) {}

  getMarketSummary(): Observable<any> {
    return this.http.get(`${this.api}/market-summary`);
  }

  getTopMovers(): Observable<any> {
    return this.http.get(`${this.api}/top-movers`);
  }

  getSignals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/signals`);
  }

  search(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/search?q=${encodeURIComponent(q)}`);
  }

  getInstruments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/instruments`);
  }

  getOhlcv(isin: string, days: number = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/ohlcv/${isin}?days=${days}`);
  }

  getTechnicals(isin: string): Observable<any> {
    return this.http.get(`${this.api}/technicals/${isin}`);
  }
}