import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PositionItem {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  sector: string;
  assetClass: string;
  purchaseDate: string;
  value: number;
  pl: number;
  plPercent: number;
  weight: number;
}

export interface SectorBreakdown {
  label: string;
  percent: number;
}

export interface AssetClassBreakdown {
  label: string;
  percent: number;
}

export interface EvolutionPoint {
  month: string;
  value: number;
}

export interface PortfolioData {
  positions: PositionItem[];
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  sectorBreakdown: SectorBreakdown[];
  assetClassBreakdown: AssetClassBreakdown[];
  evolutionData: EvolutionPoint[];
}

export interface PositionRequest {
  symbol: string;
  companyName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  sector: string;
  assetClass: string;
  purchaseDate: string;
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly apiUrl = 'http://localhost:8080/api/portfolio';

  constructor(private readonly http: HttpClient) {}

  getPortfolio(userId: string): Observable<PortfolioData> {
    return this.http.get<PortfolioData>(`${this.apiUrl}/${userId}`);
  }

  addPosition(userId: string, data: PositionRequest): Observable<PositionItem> {
    return this.http.post<PositionItem>(`${this.apiUrl}/${userId}/positions`, data);
  }

  updatePosition(userId: string, positionId: string, data: PositionRequest): Observable<PositionItem> {
    return this.http.put<PositionItem>(`${this.apiUrl}/${userId}/positions/${positionId}`, data);
  }

  deletePosition(userId: string, positionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/positions/${positionId}`);
  }
}
