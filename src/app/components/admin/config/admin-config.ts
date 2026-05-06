import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { AdminService, AdminConfig } from '../../../services/admin';

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-config.html',
  styleUrls: ['./admin-config.css'],
})
export class AdminConfigComponent implements OnInit {
  currentUser: any = null;
  config: AdminConfig | null = null;
  isLoading = true;
  isSaving = false;
  sidebarCollapsed = false;
  activeNav = 'config';
  userMenuOpen = false;

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
    this.loadConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.adminService.getConfig().subscribe({
      next: (config) => { this.config = config; this.isLoading = false; },
      error: () => { 
        this.config = {
          marketDataRefreshInterval: 60,
          sessionTimeoutMinutes: 30,
          maxLoginAttempts: 5,
          emailNotificationsEnabled: true,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          smtpUser: 'admin@example.com',
          defaultRiskLevel: 3,
          maintenanceMode: false,
          logLevel: 'INFO'
        };
        this.isLoading = false; 
      },
    });
  }

  saveConfig(): void {
    if (!this.config) return;
    this.isSaving = true;
    this.adminService.updateConfig(this.config).subscribe({
      next: (config) => { 
        this.config = config; 
        this.isSaving = false; 
        alert('Configuration sauvegardée avec succès.');
      },
      error: () => { 
        this.isSaving = false; 
        alert('Erreur lors de la sauvegarde (Mode démo actif).');
      },
    });
  }

  getAdminInitials(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

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
