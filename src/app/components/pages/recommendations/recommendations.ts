import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth';
import { RecommendationsService, Recommendation } from '../../../services/recommendations';
import { ProfileService, UserProfile } from '../../../services/profile';

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
    private profileService: ProfileService
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
        this.errorMsg = 'Impossible de charger les recommandations.';
        this.isLoading = false;
      },
    });
  }

  generate(): void {
    if (!this.currentUser?.id) return;
    this.isRefreshing = true;
    this.errorMsg = '';

    const profile = this.userProfile;
    const request = {
      userId: this.currentUser.id,
      riskTolerance: profile?.riskTolerance ?? this.currentUser.riskTolerance ?? 'MODERATE',
      investmentGoal: profile?.investmentGoal ?? 'GROWTH',
      investmentHorizon: profile?.investmentHorizon ?? 'MEDIUM_TERM',
      availableCapital: profile?.availableCapital ?? 0,
      sectors: profile?.sectors ?? [],
    };

    this.recoService.generate(request).subscribe({
      next: () => {
        this.loadRecommendations();
        this.isRefreshing = false;
      },
      error: () => {
        this.errorMsg = "Erreur lors de la génération des recommandations.";
        this.isRefreshing = false;
      },
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
    if (action === 'ACHAT')    return 'badge-achat';
    if (action === 'VENTE')    return 'badge-vente';
    return 'badge-conserver';
  }

  getActionLabel(action: string): string {
    if (action === 'ACHAT')    return 'ACHAT';
    if (action === 'VENTE')    return 'VENTE';
    return 'CONSERVER';
  }

  getActionIcon(action: string): string {
    if (action === 'ACHAT')  return '↑';
    if (action === 'VENTE')  return '↓';
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
