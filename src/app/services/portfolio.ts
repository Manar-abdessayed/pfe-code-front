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
  availableCapital: number;
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

export interface TradingInstrument {
  isin: string;
  short_name: string;
  full_name: string;
  currency: string;
  close_price: number | null;
  price_variation_pct: number | null;
}

export interface BuyRequest {
  symbol: string;
  companyName: string;
  quantity: number;
  price: number;
  sector: string;
  assetClass: string;
}

export interface SellRequest {
  positionId: string;
  quantity: number;
  price: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  companyName: string;
  quantity: number;
  price: number;
  totalAmount: number;
  transactionDate: string;
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

  getInstruments(q?: string): Observable<TradingInstrument[]> {
    const params = q && q.length >= 2 ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<TradingInstrument[]>(`${this.apiUrl}/instruments${params}`);
  }

  buyStock(userId: string, data: BuyRequest): Observable<PortfolioData> {
    return this.http.post<PortfolioData>(`${this.apiUrl}/${userId}/buy`, data);
  }

  sellStock(userId: string, data: SellRequest): Observable<PortfolioData> {
    return this.http.post<PortfolioData>(`${this.apiUrl}/${userId}/sell`, data);
  }

  getTransactions(userId: string): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/${userId}/transactions`);
  }

  getPositionAnalysis(symbol: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analysis/${encodeURIComponent(symbol)}`);
  }
}
