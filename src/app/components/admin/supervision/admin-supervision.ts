import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { AdminService, AdminStats, AdminAlert } from '../../../services/admin';

interface ChartPoint { x: number; y: number; }

@Component({
  selector: 'app-admin-supervision',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-supervision.html',
  styleUrls: ['./admin-supervision.css'],
})
export class AdminSupervisionComponent implements OnInit {
  currentUser: any = null;
  stats: AdminStats | null = null;
  alerts: AdminAlert[] = [];
  sidebarCollapsed = false;
  activeNav = 'supervision';
  userMenuOpen = false;
  isLoading = true;

  // Chart constants
  readonly W = 580; readonly H = 160;
  readonly PL = 50; readonly PR = 10; readonly PT = 15; readonly PB = 35;

  userActivityData: { hour: string; value: number }[] = [];
  responseTimeData: { hour: string; value: number }[] = [];

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
    this.generateChartData();
    this.adminService.getStats().subscribe({
      next: (s) => { this.stats = s; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
    this.adminService.getAlerts().subscribe({
      next: (a) => (this.alerts = a),
      error: () => {},
    });
  }

  private generateChartData(): void {
    const activityBase = [80,50,35,30,40,70,180,420,750,1100,1450,1780,2050,2300,2450,2480,2350,2100,1850,1580,1280,950,700,480];
    const responseBase = [310,295,280,272,278,292,305,315,335,362,385,405,425,445,435,415,395,375,362,348,332,318,305,290];
    this.userActivityData = activityBase.map((v, i) => ({
      hour: `${String(i).padStart(2,'0')}h`,
      value: v + Math.floor(Math.random() * 80),
    }));
    this.responseTimeData = responseBase.map((v, i) => ({
      hour: `${String(i).padStart(2,'0')}h`,
      value: v + Math.floor(Math.random() * 18),
    }));
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
      profil:      '/profile',
      settings:    '/settings',
    };
    if (routes[nav]) this.router.navigate([routes[nav]]);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
