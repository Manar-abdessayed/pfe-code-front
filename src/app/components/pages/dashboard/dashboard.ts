import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DashboardService } from '../../../services/dashboard';
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

  searchQuery = '';
  searchResults: any[] = [];
  showSearchDropdown = false;

  private readonly searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  constructor(
    private readonly dashboardService: DashboardService,
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

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => q.length >= 2 ? this.dashboardService.search(q) : of([]))
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.showSearchDropdown = results.length > 0;
      },
      error: () => { this.searchResults = []; this.showSearchDropdown = false; }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(q: string): void {
    this.searchQuery = q;
    this.searchSubject.next(q);
    if (q.length < 2) this.showSearchDropdown = false;
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.dashboardService.getMarketSummary().subscribe({
      next: (data) => this.marketSummary = data,
      error: (err) => console.error('market-summary error', err)
    });

    this.dashboardService.getTopMovers().subscribe({
      next: (data) => this.topMovers = data,
      error: (err) => console.error('top-movers error', err)
    });

    this.dashboardService.getSignals().subscribe({
      next: (data) => { this.signals = data; this.isLoading = false; },
      error: (err) => { console.error('signals error', err); this.isLoading = false; }
    });
  }

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

  getVariationClass(val: any): string {
    const num = Number.parseFloat(val);
    if (num > 0) return 'positive';
    if (num < 0) return 'negative';
    return '';
  }

  formatVariation(val: any): string {
    const num = Number.parseFloat(val);
    if (Number.isNaN(num)) return '0.00%';
    return (num > 0 ? '+' : '') + num.toFixed(2) + '%';
  }

  getInitials(symbol: string): string {
    if (!symbol) return '??';
    return symbol.substring(0, 2).toUpperCase();
  }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    if (nav === 'portfolio') this.router.navigate(['/portfolio']);
    if (nav === 'profil')    this.router.navigate(['/profile']);
    if (nav === 'settings')  this.router.navigate(['/settings']);
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
