import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../services/auth';
import { ProfileService, UserProfile } from '../../../services/profile';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  currentUser: any = null;
  profile: UserProfile | null = null;
  isSaving = false;
  saveSuccess = false;
  isSavingCapital = false;
  capitalSuccess = false;
  sidebarCollapsed = false;
  activeNav = 'profil';
  userMenuOpen = false;

  // Form fields (local state)
  riskLevel = 5;
  investmentGoal = 'CROISSANCE';
  investmentHorizon = 'LONG';
  availableCapital = 0;
  selectedSectors: string[] = [];

  readonly allSectors = [
    'Technologie', 'Énergie', 'Finance', 'Santé',
    'Consommation', 'Industrie', 'Services publics', 'Immobilier'
  ];

  constructor(
    private authService: Auth,
    private profileService: ProfileService,
    private router: Router
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) {
      this.userMenuOpen = false;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadProfile();
  }

  loadProfile(): void {
    this.profileService.getProfile(this.currentUser.id).subscribe({
      next: (p) => {
        this.profile = p;
        this.riskLevel = p.riskLevel || 5;
        this.investmentGoal = p.investmentGoal || 'CROISSANCE';
        this.investmentHorizon = p.investmentHorizon || 'LONG';
        this.availableCapital = p.availableCapital || 0;
        this.selectedSectors = p.sectors || [];
      },
      error: () => {
        // Pas encore de profil : valeurs par défaut
        this.riskLevel = 5;
        this.investmentGoal = 'CROISSANCE';
        this.investmentHorizon = 'LONG';
        this.availableCapital = 0;
        this.selectedSectors = [];
      }
    });
  }

  saveProfile(): void {
    if (!this.currentUser) return;
    this.isSaving = true;
    this.saveSuccess = false;

    this.profileService.updateProfile(this.currentUser.id, {
      riskLevel: this.riskLevel,
      investmentGoal: this.investmentGoal,
      investmentHorizon: this.investmentHorizon,
      availableCapital: this.availableCapital,
      sectors: this.selectedSectors
    }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => { this.isSaving = false; }
    });
  }

  saveCapital(): void {
    if (!this.currentUser) return;
    this.isSavingCapital = true;
    this.capitalSuccess = false;

    this.profileService.updateProfile(this.currentUser.id, {
      availableCapital: this.availableCapital
    }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.isSavingCapital = false;
        this.capitalSuccess = true;
        setTimeout(() => this.capitalSuccess = false, 3000);
      },
      error: () => { this.isSavingCapital = false; }
    });
  }

  toggleSector(sector: string): void {
    const idx = this.selectedSectors.indexOf(sector);
    if (idx >= 0) {
      this.selectedSectors = this.selectedSectors.filter(s => s !== sector);
    } else {
      this.selectedSectors = [...this.selectedSectors, sector];
    }
  }

  isSectorSelected(sector: string): boolean {
    return this.selectedSectors.includes(sector);
  }

  getRiskLabel(): string {
    if (this.riskLevel <= 3) return 'Prudent';
    if (this.riskLevel <= 6) return 'Modéré';
    return 'Agressif';
  }

  getRiskClass(): string {
    if (this.riskLevel <= 3) return 'risk-low';
    if (this.riskLevel <= 6) return 'risk-medium';
    return 'risk-high';
  }

  getHorizonLabel(): string {
    if (this.investmentHorizon === 'COURT') return 'Court terme (< 1 an)';
    if (this.investmentHorizon === 'MOYEN') return 'Moyen terme (1-5 ans)';
    return 'Long terme (> 5 ans)';
  }

  getGoalLabel(): string {
    if (this.investmentGoal === 'REVENUS') return 'Revenus';
    if (this.investmentGoal === 'PRESERVATION') return 'Préservation';
    return 'Croissance';
  }

  getCompletionPercent(): number {
    let filled = 0;
    const total = 5;
    if (this.riskLevel > 0) filled++;
    if (this.investmentGoal) filled++;
    if (this.investmentHorizon) filled++;
    if (this.availableCapital > 0) filled++;
    if (this.selectedSectors.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }

  getInitials(firstName: string): string {
    if (!firstName) return 'U';
    const parts = firstName.split(' ');
    const last = this.currentUser?.lastName || '';
    return ((parts[0]?.[0] || '') + (last[0] || '')).toUpperCase();
  }

  switchToAdminMode(): void {
    this.router.navigate(['/admin']);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(nav: string): void {
    this.activeNav = nav;
    if (nav === 'dashboard') this.router.navigate(['/dashboard']);
    if (nav === 'ia')        this.router.navigate(['/assistant']);
    if (nav === 'portfolio') this.router.navigate(['/portfolio']);
    if (nav === 'reco')      this.router.navigate(['/assistant']);
    if (nav === 'profil')    this.router.navigate(['/profile']);
    if (nav === 'settings')  this.router.navigate(['/settings']);
  }
}
