import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Auth } from '../../../services/auth';
import { AdminService, AdminUser, AdminUserDetail } from '../../../services/admin';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css'],
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  isLoading = true;
  sidebarCollapsed = false;
  activeNav = 'users';
  userMenuOpen = false;

  searchQuery = '';
  activeRiskFilter: string | null = null;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Detail panel
  selectedUser: AdminUser | null = null;
  userDetail: AdminUserDetail | null = null;
  detailLoading = false;
  showDeleteConfirm = false;

  private readonly currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  readonly AVATAR_COLORS = [
    ['#6366f1','#8b5cf6'], ['#3b82f6','#06b6d4'], ['#10b981','#6366f1'],
    ['#f59e0b','#ef4444'], ['#ec4899','#8b5cf6'], ['#14b8a6','#3b82f6'],
  ];

  constructor(
    private readonly authService: Auth,
    private readonly adminService: AdminService,
    private readonly router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.user-menu-wrapper')) this.userMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closePanel(); }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'ADMIN') {
      this.router.navigate(['/login']); return;
    }
    this.loadUsers();
    this.searchSub = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void { this.searchSub?.unsubscribe(); }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (u) => { this.users = u; this.applyFilters(); this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }

  onSearch(q: string): void { this.searchQuery = q; this.searchSubject.next(q); }

  setRiskFilter(f: string | null): void { this.activeRiskFilter = f; this.applyFilters(); }

  applyFilters(): void {
    let list = this.users;
    if (this.searchQuery) {
      const lq = this.searchQuery.toLowerCase();
      list = list.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(lq) ||
        u.email.toLowerCase().includes(lq)
      );
    }
    if (this.activeRiskFilter) {
      list = list.filter(u => {
        const r = u.riskLevel;
        if (this.activeRiskFilter === 'low')    return r <= 3;
        if (this.activeRiskFilter === 'medium') return r > 3 && r <= 6;
        if (this.activeRiskFilter === 'high')   return r > 6;
        return true;
      });
    }
    this.filteredUsers = list;
  }

  // ── Detail panel ───────────────────────────────────────────────────────────

  selectUser(user: AdminUser): void {
    if (this.selectedUser?.id === user.id) { this.closePanel(); return; }
    this.selectedUser = user;
    this.userDetail = null;
    this.detailLoading = true;
    this.showDeleteConfirm = false;
    this.adminService.getUserDetails(user.id).subscribe({
      next: (d) => { this.userDetail = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  closePanel(): void {
    this.selectedUser = null;
    this.userDetail = null;
    this.showDeleteConfirm = false;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  deleteUser(user: AdminUser): void {
    this.adminService.deleteUser(user.id).subscribe({
      next: () => { this.closePanel(); this.loadUsers(); },
      error: (err) => console.error('Suppression échouée', err),
    });
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  getInitials(u: AdminUser): string {
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '??';
  }

  avatarGradient(u: AdminUser): string {
    const idx = (u.firstName?.charCodeAt(0) || 0) % this.AVATAR_COLORS.length;
    const [a, b] = this.AVATAR_COLORS[idx];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }

  getRiskLabel(level: number): string {
    if (level <= 3) return 'Prudent';
    if (level <= 6) return 'Modéré';
    return 'Agressif';
  }

  getRiskClass(level: number): string {
    if (level <= 3) return 'risk-low';
    if (level <= 6) return 'risk-medium';
    return 'risk-high';
  }

  getRiskColor(level: number): string {
    if (level <= 3) return '#3b82f6';
    if (level <= 6) return '#f59e0b';
    return '#ef4444';
  }

  fmtCurrency(v: number): string { return this.currency.format(v) + ' €'; }

  fmtGoal(g: string): string {
    const map: Record<string, string> = {
      CROISSANCE: 'Croissance', REVENUS: 'Revenus', PRESERVATION: 'Préservation'
    };
    return map[g] || g || 'Non défini';
  }

  fmtHorizon(h: string): string {
    const map: Record<string, string> = { COURT: 'Court terme', MOYEN: 'Moyen terme', LONG: 'Long terme' };
    return map[h] || h || 'Non défini';
  }

  fmtDate(d?: string): string {
    if (!d) return 'Non renseigné';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  }

  fmtDateShort(d?: string): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return d; }
  }

  // ── Computed stats from users list ─────────────────────────────────────────

  get totalPortfolio(): number { return this.users.reduce((s, u) => s + u.portfolioValue, 0); }
  get activeCount(): number   { return this.users.filter(u => u.positionCount > 0).length; }
  get prudentCount(): number  { return this.users.filter(u => u.riskLevel <= 3).length; }
  get modereCount(): number   { return this.users.filter(u => u.riskLevel > 3 && u.riskLevel <= 6).length; }
  get agressifCount(): number { return this.users.filter(u => u.riskLevel > 6).length; }

  // ── Navigation ─────────────────────────────────────────────────────────────

  getAdminInitials(): string {
    return ((this.currentUser?.firstName?.[0] || '') + (this.currentUser?.lastName?.[0] || '')).toUpperCase();
  }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const r: Record<string, string> = { supervision:'/admin', users:'/admin/users', config:'/admin/config', profil:'/profile', settings:'/settings' };
    if (r[nav]) this.router.navigate([r[nav]]);
  }

  switchToUserMode(): void { this.router.navigate(['/dashboard']); }
  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
