import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { Auth } from '../../../services/auth';
import { RecommendationsService, Recommendation } from '../../../services/recommendations';
import { ProfileService, UserProfile } from '../../../services/profile';
import { AssistantService } from '../../../services/assistant';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule],
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

  constructor(
    private router: Router,
    private auth: Auth,
    private recoService: RecommendationsService,
    private profileService: ProfileService,
    private assistantService: AssistantService,
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
    this.isLoading = true;
    this.errorMsg = '';
    this.recoService.getRecommendations('all').subscribe({
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

    this.assistantService
      .createConversation(this.currentUser.id, 'recommandations')
      .pipe(
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
          const parsed = this.parseAssistantResponse(res.response ?? '');
          if (parsed.length > 0) {
            this.recommendations = parsed;
            this.applyFilter();
            this.lastUpdated = new Date().toISOString();
            // Persist to DB so the dashboard can display them
            this.recoService.saveBatch(parsed).subscribe();
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
