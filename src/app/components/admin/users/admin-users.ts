import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Auth } from '../../../services/auth';
import { AdminService, AdminUser } from '../../../services/admin';

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
  searchSubject = new Subject<string>();
  searchSubscription?: Subscription;
  activeRiskFilter: string | null = null;

  private readonly currencyFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      this.router.navigate(['/login']); return;
    }
    this.loadUsers();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => { 
        this.users = users; 
        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: () => { this.isLoading = false; },
    });
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    this.searchSubject.next(q);
  }

  setRiskFilter(level: string | null): void {
    this.activeRiskFilter = level;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.users;
    
    if (this.searchQuery) {
      const lq = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        (u.firstName + ' ' + u.lastName).toLowerCase().includes(lq) ||
        u.email.toLowerCase().includes(lq) ||
        u.role.toLowerCase().includes(lq)
      );
    }
    
    if (this.activeRiskFilter) {
      filtered = filtered.filter(u => {
        if (this.activeRiskFilter === 'low') return u.riskLevel <= 3;
        if (this.activeRiskFilter === 'medium') return u.riskLevel > 3 && u.riskLevel <= 6;
        if (this.activeRiskFilter === 'high') return u.riskLevel > 6;
        return true;
      });
    }
    
    this.filteredUsers = filtered;
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`Supprimer le compte de ${user.firstName} ${user.lastName} et toutes ses positions ?`)) return;
    this.adminService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error('Erreur suppression', err),
    });
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

  getInitials(u: AdminUser): string {
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '??';
  }

  getAdminInitials(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

  fmtCurrency(v: number): string { return this.currencyFmt.format(v) + ' €'; }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    const routes: Record<string,string> = { supervision:'/admin', users:'/admin/users', config:'/admin/config', profil:'/profile', settings:'/settings' };
    if (routes[nav]) this.router.navigate([routes[nav]]);
  }

  switchToUserMode(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
