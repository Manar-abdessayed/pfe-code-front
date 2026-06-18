import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { Auth } from '../../../services/auth';
import { RecommendationsService, Recommendation } from '../../../services/recommendations';
import { ProfileService, UserProfile } from '../../../services/profile';
import { AssistantService } from '../../../services/assistant';
import { PortfolioService } from '../../../services/portfolio';
import type { PositionItem } from '../../../services/portfolio';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recommendations.html',
  styleUrls: ['./recommendations.css'],
})
export class RecommendationsComponent implements OnInit {
  currentUser: any = null;
  userProfile: UserProfile | null = null;
  sidebarCollapsed = false;
  activeNav = 'reco';
  userMenuOpen = false;

  recommendations: Recommendation[] = [];
  filtered: Recommendation[] = [];
  activeFilter: 'all' | 'ACHAT' | 'VENTE' | 'CONSERVER' = 'all';

  isLoading = true;
  isRefreshing = false;
  errorMsg = '';
  lastUpdated: string | null = null;

  buyModal: {
    open: boolean;
    rec: Recommendation | null;
    quantity: number;
    price: number;
    sector: string;
    assetClass: string;
    isBuying: boolean;
    success: boolean;
    error: string;
  } = { open: false, rec: null, quantity: 1, price: 0, sector: 'Technologie', assetClass: 'Actions',
        isBuying: false, success: false, error: '' };

  readonly sectors      = ['Technologie', 'Finance', 'Énergie', 'Santé', 'Industrie', 'Immobilier', 'Consommation', 'Télécommunications', 'Matériaux', 'Autres'];
  readonly assetClasses = ['Actions', 'Obligations', 'ETF', 'Crypto', 'Matières premières'];

  sellModal: {
    open: boolean;
    rec: Recommendation | null;
    position: PositionItem | null;
    quantity: number;
    price: number;
    isSelling: boolean;
    success: boolean;
    error: string;
    loadingPosition: boolean;
  } = { open: false, rec: null, position: null, quantity: 1, price: 0,
        isSelling: false, success: false, error: '', loadingPosition: false };

  constructor(
    private router: Router,
    private auth: Auth,
    private recoService: RecommendationsService,
    private profileService: ProfileService,
    private assistantService: AssistantService,
    private portfolioService: PortfolioService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    if (this.currentUser?.id) {
      this.profileService.getProfile(this.currentUser.id).subscribe({
        next: (profile) => { this.userProfile = profile; },
      });
    }
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    if (!this.currentUser?.id) { this.isLoading = false; return; }
    this.isLoading = true;
    this.errorMsg = '';
    this.recoService.getRecommendations(this.currentUser.id, 'all').subscribe({
      next: (data) => {
        this.recommendations = data;
        this.applyFilter();
        if (data.length > 0) {
          this.lastUpdated = data[0].createdAt;
        }
        this.isLoading = false;
      },
      error: () => {
        this.recommendations = [];
        this.applyFilter();
        this.isLoading = false;
      },
    });
  }

  generate(): void {
    if (!this.currentUser?.id) return;
    this.isRefreshing = true;
    this.errorMsg = '';

    let tempConvId: string;

    this.assistantService
      .createConversation(this.currentUser.id, 'recommandations')
      .pipe(
        tap((conv: any) => { tempConvId = conv.id; }),
        switchMap((conv: any) =>
          this.assistantService.sendMessage(
            this.currentUser.id,
            conv.id,
            'recommandations',
            this.currentUser.email ?? '',
          )
        )
      )
      .subscribe({
        next: (res: any) => {
          // Delete the temporary conversation so it doesn't appear in the assistant
          this.assistantService.deleteConversation(this.currentUser.id, tempConvId).subscribe();

          const parsed = this.parseAssistantResponse(res.response ?? '');
          if (parsed.length > 0) {
            this.recommendations = parsed;
            this.applyFilter();
            this.lastUpdated = new Date().toISOString();
            this.recoService.saveBatch(this.currentUser.id, parsed).subscribe();
          } else {
            this.errorMsg = "Impossible de lire les recommandations de l'assistant.";
          }
          this.isRefreshing = false;
        },
        error: () => {
          this.errorMsg = 'Erreur lors de la génération des recommandations.';
          this.isRefreshing = false;
        },
      });
  }

  private parseAssistantResponse(text: string): Recommendation[] {
    const results: Recommendation[] = [];
    const blocks = text.split(/\n(?=\d+\.\s)/);

    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      const headerMatch = lines[0].match(/\d+\.\s+\S+\s+(\S+)\s+[-—–]+\s+(.+)/);
      if (!headerMatch) continue;

      const symbol = headerMatch[1].trim();
      const companyName = headerMatch[2].trim();

      let action: 'ACHAT' | 'VENTE' | 'CONSERVER' = 'CONSERVER';
      let currentPrice = 0;
      let targetPrice = 0;
      let confidence = 0;
      let analysisType = '';
      let rationale = '';
      let riskLevel: 'Faible' | 'Moyen' | 'Élevé' = 'Moyen';

      for (const line of lines.slice(1)) {
        const actionMatch = line.match(/Action\s*:\s*(ACHAT|VENTE|CONSERVER)/);
        if (actionMatch) {
          action = actionMatch[1] as 'ACHAT' | 'VENTE' | 'CONSERVER';
          const priceMatch = line.match(
            /Prix actuel\s*:\s*([\d\s]+?)\s*FCFA\s*(?:→|->|>)\s*Objectif\s*:\s*([\d\s]+?)\s*FCFA/
          );
          if (priceMatch) {
            currentPrice = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
            targetPrice  = parseInt(priceMatch[2].replace(/\s/g, ''), 10);
          }
        }

        const confMatch = line.match(/Confiance\s*:\s*(\d+)%\s*\|\s*Type\s*:\s*(.+)/);
        if (confMatch) {
          confidence   = parseInt(confMatch[1], 10);
          analysisType = confMatch[2].trim();
        }

        const riskMatch = line.match(/Risque\s*:\s*(Faible|Moyen|Élevé)/);
        if (riskMatch) riskLevel = riskMatch[1] as 'Faible' | 'Moyen' | 'Élevé';

        if (line.includes('📋')) rationale = line.replace('📋', '').trim();
      }

      if (!symbol) continue;

      results.push({
        id: `${symbol}_${Date.now()}_${results.length}`,
        userId: '',
        isin: '',
        symbol,
        companyName,
        action,
        analysisType,
        currentPrice,
        targetPrice,
        confidence,
        rationale,
        riskLevel,
        rsi: 50,
        macd: 0,
        volatility: 0,
        signalRsi:  action === 'ACHAT' ? 'Buy' : 'Sell',
        signalMacd: action === 'ACHAT' ? 'Buy' : 'Sell',
        signalBb:   action === 'ACHAT' ? 'Buy' : 'Sell',
        createdAt: new Date().toISOString(),
        active: true,
      });
    }

    return results;
  }

  openBuyModal(rec: Recommendation): void {
    this.buyModal = {
      open: true, rec,
      quantity: 1,
      price: rec.currentPrice || 0,
      sector: 'Technologie',
      assetClass: 'Actions',
      isBuying: false, success: false, error: ''
    };
  }

  closeBuyModal(): void {
    this.buyModal.open = false;
  }

  get buyTotal(): number {
    return Math.round(this.buyModal.quantity * this.buyModal.price * 100) / 100;
  }

  confirmBuy(): void {
    if (!this.currentUser?.id || !this.buyModal.rec) return;
    if (this.buyModal.quantity <= 0 || this.buyModal.price <= 0) {
      this.buyModal.error = 'Quantité et prix doivent être positifs.';
      return;
    }

    this.buyModal.isBuying = true;
    this.buyModal.error = '';

    this.portfolioService.buyStock(this.currentUser.id, {
      symbol:      this.buyModal.rec.symbol,
      companyName: this.buyModal.rec.companyName,
      quantity:    this.buyModal.quantity,
      price:       this.buyModal.price,
      sector:      this.buyModal.sector,
      assetClass:  this.buyModal.assetClass,
    }).subscribe({
      next: (portfolio) => {
        this.buyModal.isBuying = false;
        this.buyModal.success  = true;
        if (this.userProfile) {
          this.userProfile.availableCapital = portfolio.availableCapital;
        }
        setTimeout(() => this.closeBuyModal(), 1500);
      },
      error: (err) => {
        this.buyModal.isBuying = false;
        this.buyModal.error = err.error?.message || "Erreur lors de l'achat.";
      }
    });
  }

  openSellModal(rec: Recommendation): void {
    if (!this.currentUser?.id) return;
    this.sellModal = { open: true, rec, position: null, quantity: 1,
                       price: rec.currentPrice || 0, isSelling: false,
                       success: false, error: '', loadingPosition: true };

    this.portfolioService.getPortfolio(this.currentUser.id).subscribe({
      next: (portfolio) => {
        const pos = portfolio.positions.find(
          p => p.symbol.toUpperCase() === rec.symbol.toUpperCase()
        ) ?? null;
        this.sellModal.position       = pos;
        this.sellModal.price          = pos?.currentPrice ?? rec.currentPrice ?? 0;
        this.sellModal.loadingPosition = false;
        if (!pos) this.sellModal.error = `Vous ne détenez pas de position sur ${rec.symbol}.`;
      },
      error: () => {
        this.sellModal.loadingPosition = false;
        this.sellModal.error = 'Impossible de charger le portefeuille.';
      }
    });
  }

  closeSellModal(): void { this.sellModal.open = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.buyModal.open)  this.closeBuyModal();
    if (this.sellModal.open) this.closeSellModal();
  }

  get sellTotal(): number {
    return Math.round(this.sellModal.quantity * this.sellModal.price * 100) / 100;
  }

  confirmSell(): void {
    if (!this.currentUser?.id || !this.sellModal.position) return;
    const maxQty = this.sellModal.position.quantity;
    if (this.sellModal.quantity <= 0 || this.sellModal.quantity > maxQty) {
      this.sellModal.error = `Quantité invalide. Maximum : ${maxQty}.`;
      return;
    }
    if (this.sellModal.price <= 0) {
      this.sellModal.error = 'Le prix doit être positif.';
      return;
    }

    this.sellModal.isSelling = true;
    this.sellModal.error     = '';

    this.portfolioService.sellStock(this.currentUser.id, {
      positionId: this.sellModal.position.id,
      quantity:   this.sellModal.quantity,
      price:      this.sellModal.price,
    }).subscribe({
      next: (portfolio) => {
        this.sellModal.isSelling = false;
        this.sellModal.success   = true;
        if (this.userProfile) {
          this.userProfile.availableCapital = portfolio.availableCapital;
        }
        setTimeout(() => this.closeSellModal(), 1500);
      },
      error: (err) => {
        this.sellModal.isSelling = false;
        this.sellModal.error = err.error?.message || 'Erreur lors de la vente.';
      }
    });
  }

  setFilter(f: 'all' | 'ACHAT' | 'VENTE' | 'CONSERVER'): void {
    this.activeFilter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filtered = [...this.recommendations];
    } else {
      this.filtered = this.recommendations.filter(r => r.action === this.activeFilter);
    }
  }

  countByAction(action: string): number {
    return this.recommendations.filter(r => r.action === action).length;
  }

  get hasRecs(): boolean { return this.filtered.length > 0; }

  // ── Layout helpers ──────────────────────────────────────────────────────────

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }

  navigateTo(route: string): void {
    const map: Record<string, string> = {
      dashboard: '/dashboard',
      ia: '/assistant',
      portfolio: '/portfolio',
      reco: '/recommendations',
      profil: '/profile',
      settings: '/settings',
    };
    if (map[route]) this.router.navigate([map[route]]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  switchToAdminMode(): void { this.router.navigate(['/admin']); }

  // ── Display helpers ─────────────────────────────────────────────────────────

  getActionClass(action: string): string {
    if (action === 'ACHAT') return 'badge-achat';
    if (action === 'VENTE') return 'badge-vente';
    return 'badge-conserver';
  }

  getActionLabel(action: string): string {
    if (action === 'ACHAT') return 'ACHAT';
    if (action === 'VENTE') return 'VENTE';
    return 'CONSERVER';
  }

  getActionIcon(action: string): string {
    if (action === 'ACHAT') return '↑';
    if (action === 'VENTE') return '↓';
    return '→';
  }

  getRiskClass(risk: string): string {
    if (risk === 'Faible') return 'risk-low';
    if (risk === 'Élevé')  return 'risk-high';
    return 'risk-med';
  }

  getConfidenceBar(confidence: number): number {
    return Math.round(confidence);
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 85) return '#16a34a';
    if (confidence >= 70) return '#f59e0b';
    return '#dc2626';
  }

  getPriceChange(rec: Recommendation): number {
    if (rec.currentPrice === 0) return 0;
    return ((rec.targetPrice - rec.currentPrice) / rec.currentPrice) * 100;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return '—'; }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }
}
