import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import {
  PortfolioService,
  PortfolioData,
  PositionItem,
} from '../../../services/portfolio';

interface DonutSegment {
  color: string;
  pct: number;
  offset: number;
  label: string;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './portfolio.html',
  styleUrls: ['./portfolio.css'],
})
export class PortfolioComponent implements OnInit {
  currentUser: any = null;
  portfolioData: PortfolioData | null = null;
  isLoading = true;
  sidebarCollapsed = false;
  activeNav = 'portfolio';
  userMenuOpen = false;
  showModal = false;
  editingPosition: PositionItem | null = null;
  isSaving = false;
  donutSegments: DonutSegment[] = [];

  form = {
    symbol: '',
    companyName: '',
    quantity: 1,
    purchasePrice: 0,
    currentPrice: 0,
    sector: 'Technologie',
    assetClass: 'Actions',
    purchaseDate: new Date().toISOString().split('T')[0],
  };

  readonly sectors = [
    'Technologie', 'Finance', 'Énergie', 'Santé',
    'Consommation', 'Industrie', 'Autres',
  ];
  readonly assetClasses = ['Actions', 'Obligations', 'ETF', 'Crypto'];

  private readonly currencyFmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly navRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    portfolio: '/portfolio',
    profil:    '/profile',
    settings:  '/settings',
  };

  private readonly sectorColors: Record<string, string> = {
    Technologie: '#0f1629',
    Finance: '#f59e0b',
    Énergie: '#22c55e',
    Obligations: '#3b82f6',
    Santé: '#ec4899',
    Consommation: '#8b5cf6',
    Industrie: '#f97316',
    Crypto: '#ef4444',
    ETF: '#06b6d4',
    Autres: '#94a3b8',
  };

  readonly CHART_W = 760;
  readonly CHART_H = 160;
  readonly PAD_L = 55;
  readonly PAD_R = 10;
  readonly PAD_T = 15;
  readonly PAD_B = 35;

  constructor(
    private readonly authService: Auth,
    private readonly portfolioService: PortfolioService,
    private readonly router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) this.userMenuOpen = false;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) { this.router.navigate(['/login']); return; }
    this.loadPortfolio();
  }

  loadPortfolio(): void {
    this.isLoading = true;
    this.portfolioService.getPortfolio(this.currentUser.id).subscribe({
      next: (data) => {
        this.portfolioData = data;
        this.computeDonutSegments();
        this.isLoading = false;
      },
      error: () => {
        this.portfolioData = {
          positions: [], totalValue: 0, totalCost: 0,
          totalPL: 0, totalPLPercent: 0,
          sectorBreakdown: [], assetClassBreakdown: [], evolutionData: [],
        };
        this.isLoading = false;
      },
    });
  }


  computeDonutSegments(): void {
    const breakdown = this.portfolioData?.sectorBreakdown || [];
    let cumulative = 0;
    this.donutSegments = breakdown.map((s) => {
      const seg: DonutSegment = {
        color: this.sectorColors[s.label] || '#94a3b8',
        pct: s.percent,
        offset: 25 - cumulative,
        label: s.label,
      };
      cumulative += s.percent;
      return seg;
    });
  }


  private chartPoint(idx: number, val: number, total: number, minV: number, maxV: number) {
    const w = this.CHART_W - this.PAD_L - this.PAD_R;
    const h = this.CHART_H - this.PAD_T - this.PAD_B;
    const x = this.PAD_L + (idx / Math.max(total - 1, 1)) * w;
    const range = maxV - minV || 1;
    const y = this.PAD_T + h - ((val - minV) / range) * h;
    return { x, y };
  }

  private get chartMinMax(): { min: number; max: number } {
    const data = this.portfolioData?.evolutionData;
    if (!data?.length) return { min: 0, max: 1 };
    const min = Math.min(...data.map((d) => d.value)) * 0.95;
    const max = Math.max(...data.map((d) => d.value)) * 1.02;
    return { min, max };
  }

  get evolutionLinePath(): string {
    const data = this.portfolioData?.evolutionData;
    if (!data?.length) return '';
    const { min, max } = this.chartMinMax;
    return (
      'M ' +
      data
        .map((d, i) => {
          const p = this.chartPoint(i, d.value, data.length, min, max);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' L ')
    );
  }

  get evolutionAreaPath(): string {
    const data = this.portfolioData?.evolutionData;
    if (!data?.length) return '';
    const { min, max } = this.chartMinMax;
    const pts = data.map((d, i) => this.chartPoint(i, d.value, data.length, min, max));
    const bottom = this.CHART_H - this.PAD_B;
    return (
      'M ' +
      pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') +
      ` L ${pts.at(-1)?.x.toFixed(1)},${bottom}` +
      ` L ${pts[0].x.toFixed(1)},${bottom} Z`
    );
  }

  get chartXLabels(): { x: number; label: string }[] {
    const data = this.portfolioData?.evolutionData;
    if (!data?.length) return [];
    const { min, max } = this.chartMinMax;
    const step = data.length > 8 ? Math.ceil(data.length / 6) : 1;
    return data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => i % step === 0 || i === data.length - 1)
      .map(({ d, i }) => ({ x: this.chartPoint(i, 0, data.length, min, max).x, label: d.month }));
  }

  get chartYLabels(): { y: number; label: string }[] {
    const data = this.portfolioData?.evolutionData;
    if (!data?.length) return [];
    const { min, max } = this.chartMinMax;
    const h = this.CHART_H - this.PAD_T - this.PAD_B;
    return [0, 0.25, 0.5, 0.75, 1].map((s) => {
      const val = min + (max - min) * s;
      const y = this.PAD_T + h - s * h;
      return { y, label: this.formatYLabel(val) };
    });
  }

  formatYLabel(val: number): string {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return val.toFixed(0);
  }


  openAddModal(): void {
    this.editingPosition = null;
    this.form = {
      symbol: '', companyName: '',
      quantity: 1, purchasePrice: 0, currentPrice: 0,
      sector: 'Technologie', assetClass: 'Actions',
      purchaseDate: new Date().toISOString().split('T')[0],
    };
    this.showModal = true;
  }

  openEditModal(pos: PositionItem): void {
    this.editingPosition = pos;
    this.form = {
      symbol: pos.symbol, companyName: pos.companyName,
      quantity: pos.quantity, purchasePrice: pos.purchasePrice,
      currentPrice: pos.currentPrice, sector: pos.sector,
      assetClass: pos.assetClass, purchaseDate: pos.purchaseDate,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPosition = null;
  }

  submitForm(): void {
    if (!this.currentUser) return;
    this.isSaving = true;
    const obs = this.editingPosition
      ? this.portfolioService.updatePosition(this.currentUser.id, this.editingPosition.id, { ...this.form })
      : this.portfolioService.addPosition(this.currentUser.id, { ...this.form });

    obs.subscribe({
      next: () => { this.closeModal(); this.loadPortfolio(); this.isSaving = false; },
      error: () => { this.isSaving = false; },
    });
  }

  deletePosition(positionId: string): void {
    if (!this.currentUser || !confirm('Supprimer cette position ?')) return;
    this.portfolioService.deletePosition(this.currentUser.id, positionId).subscribe({
      next: () => this.loadPortfolio(),
      error: (err) => console.error('Erreur suppression position', err),
    });
  }


  exportCSV(): void {
    const positions = this.portfolioData?.positions;
    if (!positions?.length) return;
    const headers = ['Symbole', 'Société', 'Quantité', 'Prix achat', 'Prix actuel', 'Valeur', 'Plus-value', 'Secteur', 'Classe'];
    const rows = positions.map((p) => [
      p.symbol, p.companyName, p.quantity,
      p.purchasePrice.toFixed(2), p.currentPrice.toFixed(2),
      p.value.toFixed(2), p.pl.toFixed(2),
      p.sector, p.assetClass,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'portefeuille.csv';
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }


  getInitials(symbol: string): string {
    return (symbol || '??').substring(0, 2).toUpperCase();
  }

  getInitialsUser(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

  getSectorColor(sector: string): string {
    return this.sectorColors[sector] || '#94a3b8';
  }

  formatCurrency(val: number): string {
    return this.currencyFmt.format(val) + ' €';
  }

  formatPercent(val: number): string {
    return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
  }

  plClass(val: number): string {
    return val >= 0 ? 'positive' : 'negative';
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const route = this.navRoutes[nav];
    if (route) this.router.navigate([route]);
  }
}
