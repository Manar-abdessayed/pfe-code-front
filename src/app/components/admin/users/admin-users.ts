import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { AdminService, AdminUser } from '../../../services/admin';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css'],
})
export class AdminUsersComponent implements OnInit {
  currentUser: any = null;
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  isLoading = true;
  sidebarCollapsed = false;
  activeNav = 'users';
  userMenuOpen = false;
  searchQuery = '';

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
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => { this.users = users; this.filteredUsers = users; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    const lq = q.toLowerCase();
    this.filteredUsers = this.users.filter(u =>
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(lq) ||
      u.email.toLowerCase().includes(lq)
    );
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
    const routes: Record<string,string> = { supervision:'/admin', users:'/admin/users', profil:'/profile', settings:'/settings' };
    if (routes[nav]) this.router.navigate([routes[nav]]);
  }

  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleUserMenu(e: MouseEvent): void { e.stopPropagation(); this.userMenuOpen = !this.userMenuOpen; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
}
