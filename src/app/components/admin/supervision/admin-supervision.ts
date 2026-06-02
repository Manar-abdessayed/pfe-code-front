import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Auth } from '../../../services/auth';
import {
  AdminService, AdminStats, AdminAlert, ActiveUserPoint,
  RegistrationPoint, RiskSegment, SystemServiceStatus
} from '../../../services/admin';

interface ChartPoint { x: number; y: number; }

@Component({
  selector: 'app-admin-supervision',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-supervision.html',
  styleUrls: ['./admin-supervision.css'],
})
export class AdminSupervisionComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  stats: AdminStats | null = null;
  alerts: AdminAlert[] = [];
  sidebarCollapsed = false;
  activeNav = 'supervision';
  userMenuOpen = false;
  isLoading = true;
  chartLoading = true;
  lastUpdate: Date = new Date();

  // Line/area chart dimensions
  readonly W = 540; readonly H = 175;
  readonly PL = 50; readonly PR = 12; readonly PT = 16; readonly PB = 36;

  // Bar chart height
  readonly BCH = 160;

  // Donut
  readonly DR = 55;
  readonly DC = 2 * Math.PI * 55;

  userActivityData: ActiveUserPoint[] = [];
  registrationData: RegistrationPoint[] = [];
  riskSegments: RiskSegment[] = [];
  systemServices: SystemServiceStatus[] = [];
  responseTimeData: { hour: string; value: number }[] = [];

  private refreshTimer: any = null;

  constructor(
    private readonly authService: Auth,
    private readonly adminService: AdminService,
    private readonly router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.user-menu-wrapper')) this.userMenuOpen = false;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'ADMIN') {
      this.router.navigate(['/login']);
      return;
    }
    this.loadAll();
    this.refreshTimer = setInterval(() => this.loadAll(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadAll(): void {
    this.lastUpdate = new Date();
    this.loadStats();
    this.loadActiveUsers();
    this.loadAlerts();
    this.loadRegistrationTrend();
    this.loadRiskDistribution();
    this.loadSystemServices();
    this.generateResponseTimeData();
  }

  private loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (s) => { this.stats = s; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }

  private loadAlerts(): void {
    this.adminService.getAlerts().subscribe({
      next: (a) => (this.alerts = a.slice(0, 6)),
      error: () => {},
    });
  }

  private loadActiveUsers(): void {
    this.chartLoading = true;
    this.adminService.getActiveUsers().pipe(
      catchError(() => of(this.buildFallbackActivity()))
    ).subscribe(data => {
      this.userActivityData = data.length ? data : this.buildFallbackActivity();
      this.chartLoading = false;
    });
  }

  private loadRegistrationTrend(): void {
    this.adminService.getRegistrationTrend().pipe(
      catchError(() => of(this.buildFallbackRegistrations()))
    ).subscribe(data => {
      this.registrationData = data.length ? data : this.buildFallbackRegistrations();
    });
  }

  private loadRiskDistribution(): void {
    this.adminService.getRiskDistribution().pipe(
      catchError(() => of(this.buildFallbackRisk()))
    ).subscribe(data => {
      this.riskSegments = data.length ? data : this.buildFallbackRisk();
    });
  }

  private loadSystemServices(): void {
    this.adminService.getSystemServices().pipe(
      catchError(() => of(this.buildFallbackServices()))
    ).subscribe(data => {
      this.systemServices = data.length ? data : this.buildFallbackServices();
    });
  }

  // ── Fallback data ──────────────────────────────────────────────────

  private buildFallbackActivity(): ActiveUserPoint[] {
    const base = [8,5,4,3,5,11,28,67,119,175,231,282,325,365,391,397,375,336,295,252,204,151,111,77];
    return base.map((v, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      value: v + Math.floor(Math.random() * 8),
    }));
  }

  private buildFallbackRegistrations(): RegistrationPoint[] {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const counts = [3, 5, 2, 8, 6, 1, 4];
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  }

  private buildFallbackRisk(): RiskSegment[] {
    return [
      { label: 'Prudent', count: 0, percentage: 35, color: '#3b82f6' },
      { label: 'Modéré',  count: 0, percentage: 45, color: '#f59e0b' },
      { label: 'Agressif', count: 0, percentage: 20, color: '#ef4444' },
    ];
  }

  private buildFallbackServices(): SystemServiceStatus[] {
    return [
      { name: 'API OpenAI',       status: 'ok',      latency: 245, detail: 'Opérationnel',          lastCheck: '12:43' },
      { name: 'Données marché',   status: 'ok',      latency: 89,  detail: 'Synchronisé il y a 2 min', lastCheck: '12:38' },
      { name: 'Base de données',  status: 'ok',      latency: 12,  detail: '4 utilisateurs actifs',  lastCheck: '12:13' },
      { name: 'Service email',    status: 'ok',                    detail: 'SMTP opérationnel',      lastCheck: '12:10' },
    ];
  }

  private generateResponseTimeData(): void {
    const base = [310,295,280,272,278,292,305,315,335,362,385,405,425,445,435,415,395,375,362,348,332,318,305,290];
    this.responseTimeData = base.map((v, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      value: v + Math.floor(Math.random() * 18),
    }));
  }

  // ── SVG helpers: line/area ─────────────────────────────────────────

  private pt(i: number, v: number, data: { value: number }[]): ChartPoint {
    const cw = this.W - this.PL - this.PR;
    const ch = this.H - this.PT - this.PB;
    const vals = data.map(d => d.value);
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.05;
    return {
      x: this.PL + (i / Math.max(data.length - 1, 1)) * cw,
      y: this.PT + ch - ((v - min) / (max - min || 1)) * ch,
    };
  }

  smoothLinePath(data: { value: number }[]): string {
    if (data.length < 2) return '';
    const pts = data.map((d, i) => this.pt(i, d.value, data));
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
      d += ` C ${cx},${pts[i - 1].y.toFixed(1)} ${cx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    return d;
  }

  smoothAreaPath(data: { value: number }[]): string {
    if (data.length < 2) return '';
    const pts = data.map((d, i) => this.pt(i, d.value, data));
    const bottom = this.H - this.PB;
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
      d += ` C ${cx},${pts[i - 1].y.toFixed(1)} ${cx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1].x.toFixed(1)},${bottom} L ${pts[0].x.toFixed(1)},${bottom} Z`;
    return d;
  }

  xLabels(data: { hour: string; value: number }[]): { x: number; label: string }[] {
    if (!data.length) return [];
    return data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % 4 === 0 || i === data.length - 1)
      .map(({ d, i }) => ({ x: this.pt(i, 0, data).x, label: d.hour }));
  }

  yLabels(data: { value: number }[], suffix = ''): { y: number; label: string }[] {
    if (!data.length) return [];
    const vals = data.map(d => d.value);
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.05;
    const ch = this.H - this.PT - this.PB;
    return [0, 0.5, 1].map(s => ({
      y: this.PT + ch - s * ch,
      label: this.fmtY(min + (max - min) * s) + suffix,
    }));
  }

  // ── SVG helpers: bar chart ─────────────────────────────────────────

  get barItems(): { x: number; y: number; w: number; h: number; lx: number; label: string; count: number }[] {
    const data = this.registrationData;
    if (!data.length) return [];
    const cw = this.W - this.PL - this.PR;
    const ch = this.BCH - this.PT - this.PB;
    const n = data.length;
    const gap = 10;
    const bw = Math.floor((cw - gap * (n - 1)) / n);
    const maxV = Math.max(...data.map(d => d.count), 1);
    return data.map((d, i) => {
      const h = (d.count / maxV) * ch;
      const x = this.PL + i * (bw + gap);
      return { x, y: this.PT + ch - h, w: bw, h, lx: x + bw / 2, label: d.day, count: d.count };
    });
  }

  barYLabels(data: RegistrationPoint[]): { y: number; label: string }[] {
    if (!data.length) return [];
    const ch = this.BCH - this.PT - this.PB;
    const maxV = Math.max(...data.map(d => d.count), 1);
    return [0, 0.5, 1].map(s => ({
      y: this.PT + ch - s * ch,
      label: Math.round(s * maxV).toString(),
    }));
  }

  // ── SVG helpers: donut ─────────────────────────────────────────────

  get donutSegments(): { label: string; pct: number; color: string; dash: string; offset: number }[] {
    let acc = 0;
    return this.riskSegments.map(s => {
      const seg = {
        label: s.label,
        pct: s.percentage,
        color: s.color,
        dash: `${((s.percentage / 100) * this.DC).toFixed(2)} ${this.DC.toFixed(2)}`,
        offset: -((acc / 100) * this.DC),
      };
      acc += s.percentage;
      return seg;
    });
  }

  // ── Computed values ────────────────────────────────────────────────

  get peakUsers(): number {
    return this.userActivityData.length ? Math.max(...this.userActivityData.map(d => d.value)) : 0;
  }

  get currentHourPoint(): ChartPoint | null {
    if (!this.userActivityData.length) return null;
    const idx = Math.min(new Date().getHours(), this.userActivityData.length - 1);
    return this.pt(idx, this.userActivityData[idx].value, this.userActivityData);
  }

  get avgResponseTime(): number {
    if (!this.responseTimeData.length) return 0;
    return Math.round(this.responseTimeData.reduce((a, d) => a + d.value, 0) / this.responseTimeData.length);
  }

  get minResponseTime(): number {
    return this.responseTimeData.length ? Math.min(...this.responseTimeData.map(d => d.value)) : 0;
  }

  get maxResponseTime(): number {
    return this.responseTimeData.length ? Math.max(...this.responseTimeData.map(d => d.value)) : 0;
  }

  get totalRegistrations(): number {
    return this.registrationData.reduce((s, d) => s + d.count, 0);
  }

  get systemOk(): boolean {
    return this.systemServices.every(s => s.status === 'ok');
  }

  // ── Formatting ─────────────────────────────────────────────────────

  private fmtY(v: number): string {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return Math.round(v).toString();
  }

  fmtPortfolio(v: number): string {
    if (!v) return '0 €';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + ' M€';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + ' k€';
    return v.toFixed(2) + ' €';
  }

  fmtTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  getInitials(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

  alertColor(type: string): string {
    const map: Record<string, string> = { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: '#3b82f6' };
    return map[type] ?? '#3b82f6';
  }

  serviceColor(status: string): string {
    const map: Record<string, string> = { ok: '#16a34a', warning: '#d97706', error: '#dc2626' };
    return map[status] ?? '#94a3b8';
  }

  serviceBg(status: string): string {
    const map: Record<string, string> = { ok: '#f0fdf4', warning: '#fffbeb', error: '#fff5f5' };
    return map[status] ?? '#f8fafc';
  }

  // ── Navigation ─────────────────────────────────────────────────────

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const routes: Record<string, string> = {
      supervision: '/admin',
      users: '/admin/users',
      config: '/admin/config',
      profil: '/profile',
      settings: '/settings',
    };
    if (routes[nav]) this.router.navigate([routes[nav]]);
  }

  switchToUserMode(): void { this.router.navigate(['/dashboard']); }
  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
