import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DashboardService } from '../../../services/dashboard';
import { PortfolioService } from '../../../services/portfolio';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  currentUser: any = null;
  marketSummary: any = null;
  topMovers: any = { gainers: [], losers: [] };
  signals: any[] = [];
  isLoading = true;
  sidebarCollapsed = false;
  activeNav = 'dashboard';
  userMenuOpen = false;

  // Portfolio (valeur + performance)
  portfolioData: any = null;
  performancePeriod: '7J' | '15J' | '1M' | '3M' = '1M';
  marketPerf: any[] = [];
  portfolioLoading = true;

  // Alerts
  alerts: any[] = [];
  unreadAlerts = 0;

  searchQuery = '';
  searchResults: any[] = [];
  showSearchDropdown = false;

  // Analytics
  signalDistribution: any = null;
  volumeTrend: any[] = [];
  rsiZones: any = null;
  marketVolatility: any[] = [];
  macdTrend: any[] = [];
  analyticsLoading = true;

  private readonly searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly portfolioService: PortfolioService,
    private readonly authService: Auth,
    private readonly router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) this.userMenuOpen = false;
    if (!target.closest('.topbar-search')) this.showSearchDropdown = false;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
    this.loadPortfolioData();

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length >= 2 ? this.dashboardService.search(q) : of([]))
    ).subscribe({
      next: results => { this.searchResults = results; this.showSearchDropdown = results.length > 0; },
      error: ()      => { this.searchResults = []; this.showSearchDropdown = false; }
    });
  }

  ngOnDestroy(): void { this.searchSub?.unsubscribe(); }

  onSearchInput(q: string): void {
    this.searchQuery = q;
    this.searchSubject.next(q);
    if (q.length < 2) this.showSearchDropdown = false;
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadPortfolioData(): void {
    if (!this.currentUser?.id) { this.portfolioLoading = false; return; }
    this.portfolioLoading = true;

    forkJoin([
      this.portfolioService.getPortfolio(this.currentUser.id),
      this.dashboardService.getMarketPerformance(12)
    ]).subscribe({
      next: ([portfolio, perf]) => {
        this.portfolioData = portfolio;
        this.marketPerf    = (perf as any[]).reverse ? [...(perf as any[])].sort((a, b) => a.month.localeCompare(b.month)) : perf as any[];
        this.portfolioLoading = false;
      },
      error: () => { this.portfolioLoading = false; }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.dashboardService.getMarketSummary().subscribe({
      next: data => { this.marketSummary = data; this.buildAlerts(); },
      error: err  => console.error('market-summary error', err)
    });

    this.dashboardService.getTopMovers().subscribe({
      next: data => { this.topMovers = data; this.buildAlerts(); },
      error: err  => console.error('top-movers error', err)
    });

    this.dashboardService.getSignals().subscribe({
      next: data => { this.signals = data; this.isLoading = false; },
      error: err  => { console.error('signals error', err); this.isLoading = false; }
    });

    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.analyticsLoading = true;
    let pending = 5;
    const done = () => { if (--pending === 0) this.analyticsLoading = false; };

    this.dashboardService.getSignalDistribution().subscribe({ next: d => { this.signalDistribution = d; done(); }, error: () => done() });
    this.dashboardService.getVolumeTrend().subscribe({ next: d => { this.volumeTrend = d; done(); }, error: () => done() });
    this.dashboardService.getRsiZones().subscribe({ next: d => { this.rsiZones = d; done(); }, error: () => done() });
    this.dashboardService.getMarketVolatility().subscribe({ next: d => { this.marketVolatility = d; done(); }, error: () => done() });
    this.dashboardService.getMacdTrend().subscribe({ next: d => { this.macdTrend = d; done(); }, error: () => done() });
  }

  buildAlerts(): void {
    if (!this.topMovers?.gainers || !this.topMovers?.losers) return;
    const date = this.topMovers.date || '';
    const built: any[] = [
      ...this.topMovers.gainers.slice(0, 3).map((g: any) => ({
        color: 'green',
        title: `${g.symbol || g.short_name} franchit un nouveau plus haut`,
        sub:   `${g.short_name || g.symbol} atteint ${(+g.close_price).toFixed(2)} avec une hausse de ${this.formatVariation(g.price_variation_pct)}`,
        date
      })),
      ...this.topMovers.losers.slice(0, 2).map((l: any) => ({
        color: 'red',
        title: `${l.symbol || l.short_name} en forte baisse`,
        sub:   `Clôture à ${(+l.close_price).toFixed(2)} — variation ${this.formatVariation(l.price_variation_pct)}`,
        date
      }))
    ];
    this.alerts = built;
    this.unreadAlerts = Math.min(built.length, 2);
  }

  // ── Portfolio value card ────────────────────────────────────────────────────

  get portfolioDailyChange(): number {
    if (!this.portfolioData?.totalValue || !this.marketSummary?.variationMoyenne) return 0;
    return this.portfolioData.totalValue * (Number(this.marketSummary.variationMoyenne) / 100);
  }

  get portfolioDailyChangePct(): number {
    return Number(this.marketSummary?.variationMoyenne) || 0;
  }

  // Mini sparkline (last 6 points of evolution)
  get sparklineData(): any[] {
    const ev = this.portfolioData?.evolutionData || [];
    return ev.slice(-6);
  }

  sparklinePath(h = 40, w = 120): string {
    const data = this.sparklineData;
    if (data.length < 2) return '';
    const vals = data.map((d: any) => Number(d.value));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return data.map((d: any, i: number) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((Number(d.value) - min) / range) * (h - 6) - 3;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  sparklineAreaPath(h = 40, w = 120): string {
    const data = this.sparklineData;
    if (data.length < 2) return '';
    const vals = data.map((d: any) => Number(d.value));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = data.map((d: any, i: number) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((Number(d.value) - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = pts[pts.length - 1].split(',');
    const first = pts[0].split(',');
    return `M ${pts.join(' L ')} L ${last[0]} ${h} L ${first[0]} ${h} Z`;
  }

  // ── Performance chart (% change from period start) ─────────────────────────

  setPerformancePeriod(p: '7J' | '15J' | '1M' | '3M'): void {
    this.performancePeriod = p;
  }

  get filteredEvolution(): any[] {
    const ev: any[] = this.portfolioData?.evolutionData || [];
    const limits: Record<string, number> = { '7J': 7, '15J': 15, '1M': 30, '3M': 90 };
    const n = limits[this.performancePeriod] || 30;
    return ev.slice(-n);
  }

  // Normalize to % change relative to the first point of the period
  get normalizedEvolution(): { month: string; pct: number }[] {
    const data = this.filteredEvolution;
    if (!data.length) return [];
    const base = data[0].value || 1;
    return data.map((d: any) => ({
      month: d.month,
      pct: base > 0 ? ((d.value - base) / base) * 100 : 0
    }));
  }

  // Final % for the selected period (shown in header badge)
  get periodPerformancePct(): number {
    const norm = this.normalizedEvolution;
    return norm.length ? norm.at(-1)!.pct : 0;
  }

  get isPeriodPositive(): boolean {
    return this.periodPerformancePct >= 0;
  }

  private normMinMax(): { min: number; max: number } {
    const vals = this.normalizedEvolution.map(d => d.pct);
    if (!vals.length) return { min: -1, max: 1 };
    const rawMin = Math.min(...vals, 0);
    const rawMax = Math.max(...vals, 0);
    const pad = (rawMax - rawMin) * 0.25 || 0.5;
    return { min: rawMin - pad, max: rawMax + pad };
  }

  private normPtY(pct: number, H: number, min: number, max: number): number {
    const range = max - min || 1;
    return H - ((pct - min) / range) * (H - 12) - 6;
  }

  perfPortfolioPath(W = 548, H = 130): string {
    const data = this.normalizedEvolution;
    if (data.length < 2) return '';
    const { min, max } = this.normMinMax();
    return data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * W;
      const y = this.normPtY(d.pct, H, min, max);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  perfPortfolioAreaPath(W = 548, H = 130): string {
    const data = this.normalizedEvolution;
    if (data.length < 2) return '';
    const { min, max } = this.normMinMax();
    const zeroY = Math.min(this.normPtY(0, H, min, max), H);
    const pts = data.map((d, i) => ({
      x: (i / Math.max(data.length - 1, 1)) * W,
      y: this.normPtY(d.pct, H, min, max)
    }));
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `M ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${last.x.toFixed(1)} ${zeroY.toFixed(1)} L ${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }

  // Y coordinate of the 0% reference line
  get perfZeroLineY(): number {
    const { min, max } = this.normMinMax();
    return Math.min(this.normPtY(0, 130, min, max), 130);
  }

  get perfXLabels(): { x: number; label: string }[] {
    const data = this.normalizedEvolution;
    if (!data.length) return [];
    const W = 548;
    const step = data.length > 6 ? Math.ceil(data.length / 6) : 1;
    return data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % step === 0 || i === data.length - 1)
      .map(({ d, i }) => ({
        x: (i / Math.max(data.length - 1, 1)) * W,
        label: d.month
      }));
  }

  get perfYLabels(): { y: number; label: string }[] {
    const { min, max } = this.normMinMax();
    if (!this.normalizedEvolution.length) return [];
    const H = 130;
    return [0, 0.25, 0.5, 0.75, 1].map(s => {
      const val = min + (max - min) * s;
      const y   = H - s * (H - 12) - 6;
      const sign = val > 0 ? '+' : '';
      return { y, label: `${sign}${val.toFixed(1)}%` };
    });
  }

  // ── Signal helpers ──────────────────────────────────────────────────────────

  getSignalClass(signal: string): string {
    if (!signal) return 'signal-hold';
    const s = signal.toLowerCase();
    if (s === 'buy' || s === 'achat') return 'signal-buy';
    if (s === 'sell' || s === 'vente') return 'signal-sell';
    return 'signal-hold';
  }

  getSignalLabel(signal: string): string {
    if (!signal) return 'Conserver';
    const s = signal.toLowerCase();
    if (s === 'buy' || s === 'achat') return 'Achat';
    if (s === 'sell' || s === 'vente') return 'Vente';
    return 'Conserver';
  }

  getConfidence(signal: any): number {
    const dominant = signal.globalSignal?.toLowerCase() || '';
    const aligned = [signal.signal_rsi, signal.signal_macd, signal.signal_bb]
      .filter(s => s?.toLowerCase() === dominant).length;
    const rsi = Number(signal.rsi_14);
    const rsiBonus = !isNaN(rsi) && (rsi < 30 || rsi > 70) ? 5 : 0;
    if (aligned === 3) return Math.min(88 + rsiBonus, 96);
    if (aligned === 2) return Math.min(68 + rsiBonus, 82);
    return Math.min(48 + rsiBonus, 62);
  }

  // ── Formatting helpers ──────────────────────────────────────────────────────

  getVariationClass(val: any): string {
    const n = Number.parseFloat(val);
    return n > 0 ? 'positive' : n < 0 ? 'negative' : '';
  }

  formatVariation(val: any): string {
    const n = Number.parseFloat(val);
    if (Number.isNaN(n)) return '0.00%';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' €';
  }

  getInitials(symbol: string): string {
    if (!symbol) return '??';
    return symbol.substring(0, 2).toUpperCase();
  }

  // ── Donut helpers ───────────────────────────────────────────────────────────

  donutDashArray(count: number, total: number): string {
    const circ = 251.2;
    if (!total) return `0 ${circ}`;
    const arc = (count / total) * circ;
    return `${arc.toFixed(2)} ${(circ - arc).toFixed(2)}`;
  }

  donutDashOffset(priorCount: number, total: number): number {
    if (!total) return 62.8;
    return 62.8 - (priorCount / total) * 251.2;
  }

  // ── SVG line/area chart helpers (300×100 viewBox) ──────────────────────────

  private pt(data: any[], key: string, i: number, w = 300, h = 100): { x: number; y: number } {
    const vals = data.map(d => Number(d[key]));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return {
      x: (i / (data.length - 1)) * w,
      y: h - ((vals[i] - min) / range) * (h - 10) - 5
    };
  }

  linePath(data: any[], key: string): string {
    if (!data || data.length < 2) return '';
    return data.map((_, i) => {
      const p = this.pt(data, key, i);
      return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }).join(' ');
  }

  areaPath(data: any[], key: string, h = 100): string {
    if (!data || data.length < 2) return '';
    const line = this.linePath(data, key);
    const last  = this.pt(data, key, data.length - 1);
    const first = this.pt(data, key, 0);
    return `${line} L ${last.x.toFixed(1)} ${h} L ${first.x.toFixed(1)} ${h} Z`;
  }

  xLabels(data: any[], dateKey = 'date'): { x: number; label: string }[] {
    if (!data || !data.length) return [];
    const indices = [0, Math.floor(data.length / 2), data.length - 1];
    return indices.map(i => ({
      x: (i / (data.length - 1)) * 300,
      label: (data[i][dateKey] as string || '').slice(5)
    }));
  }

  maxVolatility(): number {
    if (!this.marketVolatility.length) return 1;
    return Math.max(...this.marketVolatility.map(d => Number(d['avgVolatility']))) || 1;
  }

  volBarWidth(v: any): number {
    return (Number(v['avgVolatility']) / this.maxVolatility()) * 100;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  navigateTo(nav: string): void {
    this.activeNav = nav;
    if (nav === 'portfolio') this.router.navigate(['/portfolio']);
    if (nav === 'ia')        this.router.navigate(['/assistant']);
    if (nav === 'profil')    this.router.navigate(['/profile']);
    if (nav === 'settings')  this.router.navigate(['/settings']);
  }

  switchToAdminMode(): void {
    this.router.navigate(['/admin']);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
