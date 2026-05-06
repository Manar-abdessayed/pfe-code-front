import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { AdminService, AdminStats, AdminAlert, ActiveUserPoint } from '../../../services/admin';

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

  // Chart constants
  readonly W = 580; readonly H = 160;
  readonly PL = 50; readonly PR = 10; readonly PT = 15; readonly PB = 35;

  userActivityData: ActiveUserPoint[] = [];
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
    this.loadActiveUsers();
    this.generateResponseTimeData();
    this.adminService.getStats().subscribe({
      next: (s) => { this.stats = s; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
    this.adminService.getAlerts().subscribe({
      next: (a) => (this.alerts = a),
      error: () => {},
    });
    // Auto-refresh active users every 60 seconds
    this.refreshTimer = setInterval(() => this.loadActiveUsers(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private loadActiveUsers(): void {
    this.chartLoading = true;
    this.adminService.getActiveUsers().subscribe({
      next: (data) => {
        this.userActivityData = data;
        this.chartLoading = false;
      },
      error: () => {
        this.userActivityData = [];
        this.chartLoading = false;
      },
    });
  }

  private buildFallbackActivityData(): ActiveUserPoint[] {
    const base = [61,45,38,32,40,68,175,415,742,1090,1440,1760,2030,2280,2440,2480,2340,2095,1840,1570,1270,940,695,480];
    return base.map((v, i) => ({
      hour: `${String(i).padStart(2,'0')}h`,
      value: v + Math.floor(Math.random() * 40),
    }));
  }

  private generateResponseTimeData(): void {
    const responseBase = [310,295,280,272,278,292,305,315,335,362,385,405,425,445,435,415,395,375,362,348,332,318,305,290];
    this.responseTimeData = responseBase.map((v, i) => ({
      hour: `${String(i).padStart(2,'0')}h`,
      value: v + Math.floor(Math.random() * 18),
    }));
  }

  switchToUserMode(): void {
    this.router.navigate(['/dashboard']);
  }

  get peakUsers(): number {
    if (!this.userActivityData.length) return 0;
    return Math.max(...this.userActivityData.map(d => d.value));
  }

  get currentHourPoint(): ChartPoint | null {
    if (!this.userActivityData.length) return null;
    const h = new Date().getHours();
    const idx = Math.min(h, this.userActivityData.length - 1);
    return this.pt(idx, this.userActivityData[idx].value, this.userActivityData);
  }

  private pt(i: number, v: number, data: {value:number}[]): ChartPoint {
    const w = this.W - this.PL - this.PR;
    const h = this.H - this.PT - this.PB;
    const vals = data.map(d => d.value);
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.05;
    return {
      x: this.PL + (i / Math.max(data.length - 1, 1)) * w,
      y: this.PT + h - ((v - min) / (max - min || 1)) * h,
    };
  }

  linePath(data: {value:number}[]): string {
    if (!data.length) return '';
    return 'M ' + data.map((d, i) => {
      const p = this.pt(i, d.value, data);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' L ');
  }

  areaPath(data: {value:number}[]): string {
    if (!data.length) return '';
    const pts = data.map((d, i) => this.pt(i, d.value, data));
    const bottom = this.H - this.PB;
    return 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
      + ` L ${pts.at(-1)?.x.toFixed(1)},${bottom} L ${pts[0].x.toFixed(1)},${bottom} Z`;
  }

  xLabels(data: {hour:string;value:number}[]): {x:number;label:string}[] {
    if (!data.length) return [];
    const step = 4;
    return data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % step === 0 || i === data.length - 1)
      .map(({ d, i }) => ({ x: this.pt(i, 0, data).x, label: d.hour }));
  }

  yLabels(data: {value:number}[]): {y:number;label:string}[] {
    if (!data.length) return [];
    const vals = data.map(d => d.value);
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.05;
    const h = this.H - this.PT - this.PB;
    return [0, 0.25, 0.5, 0.75, 1].map(s => ({
      y: this.PT + h - s * h,
      label: this.fmtY(min + (max - min) * s),
    }));
  }

  private fmtY(v: number): string {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return v.toFixed(0);
  }

  fmtPortfolio(v: number): string {
    if (!v) return '0 €';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + ' M€';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + ' k€';
    return v.toFixed(2) + ' €';
  }

  getInitials(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

  alertIconColor(type: string): string {
    if (type === 'success') return '#16a34a';
    if (type === 'warning') return '#d97706';
    if (type === 'error')   return '#dc2626';
    return '#3b82f6';
  }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const routes: Record<string,string> = {
      supervision: '/admin',
      users:       '/admin/users',
      config:      '/admin/config',
      profil:      '/profile',
      settings:    '/settings',
    };
    if (routes[nav]) this.router.navigate([routes[nav]]);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
