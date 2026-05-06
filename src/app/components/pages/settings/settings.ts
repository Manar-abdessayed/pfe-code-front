import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { SettingsService, UserSettings } from '../../../services/settings';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsComponent implements OnInit {
  currentUser: any = null;
  settings: UserSettings | null = null;
  sidebarCollapsed = false;
  activeNav = 'settings';
  userMenuOpen = false;

  // Personal info form
  profileForm = { firstName: '', lastName: '', email: '', phoneNumber: '' };
  isSavingProfile = false;
  profileSuccess = false;
  profileError = '';

  // Password form
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  isSavingPassword = false;
  passwordSuccess = false;
  passwordError = '';
  showCurrentPw = false;
  showNewPw = false;
  showConfirmPw = false;

  // Notifications
  notifPrefs = { emailNotifications: true, marketAlerts: true, portfolioAlerts: true };
  isSavingNotifs = false;
  notifsSuccess = false;

  private readonly navRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    ia:        '/assistant',
    portfolio: '/portfolio',
    reco:      '/assistant',
    profil:    '/profile',
    settings:  '/settings',
  };

  constructor(
    private readonly authService: Auth,
    private readonly settingsService: SettingsService,
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
    this.loadSettings();
  }

  loadSettings(): void {
    this.settingsService.getSettings(this.currentUser.id).subscribe({
      next: (s) => {
        this.settings = s;
        this.profileForm = {
          firstName: s.firstName || '',
          lastName: s.lastName || '',
          email: s.email || '',
          phoneNumber: s.phoneNumber || '',
        };
        this.notifPrefs = {
          emailNotifications: s.emailNotifications,
          marketAlerts: s.marketAlerts,
          portfolioAlerts: s.portfolioAlerts,
        };
      },
      error: () => {},
    });
  }

  saveProfile(): void {
    this.isSavingProfile = true;
    this.profileSuccess = false;
    this.profileError = '';

    this.settingsService.updateProfile(this.currentUser.id, this.profileForm).subscribe({
      next: (updated) => {
        this.settings = updated;
        this.isSavingProfile = false;
        this.profileSuccess = true;
        // Update local auth cache so the topbar name updates
        const stored = this.authService.getCurrentUser();
        if (stored) {
          stored.firstName = updated.firstName;
          stored.lastName = updated.lastName;
          stored.email = updated.email;
          localStorage.setItem('user', JSON.stringify(stored));
          this.currentUser = stored;
        }
        setTimeout(() => this.profileSuccess = false, 3000);
      },
      error: (err) => {
        this.isSavingProfile = false;
        this.profileError = err?.error?.message || 'Erreur lors de la sauvegarde.';
      },
    });
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = false;

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.isSavingPassword = true;
    this.settingsService.changePassword(
      this.currentUser.id,
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSuccess = true;
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        setTimeout(() => this.passwordSuccess = false, 3000);
      },
      error: (err) => {
        this.isSavingPassword = false;
        this.passwordError = err?.error?.message || 'Erreur lors du changement de mot de passe.';
      },
    });
  }

  saveNotifications(): void {
    this.isSavingNotifs = true;
    this.settingsService.updateNotifications(this.currentUser.id, this.notifPrefs).subscribe({
      next: () => {
        this.isSavingNotifs = false;
        this.notifsSuccess = true;
        setTimeout(() => this.notifsSuccess = false, 3000);
      },
      error: () => { this.isSavingNotifs = false; },
    });
  }

  getInitialsUser(): string {
    const f = this.currentUser?.firstName?.[0] || '';
    const l = this.currentUser?.lastName?.[0] || '';
    return (f + l).toUpperCase();
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
