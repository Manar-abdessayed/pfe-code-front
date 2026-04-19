import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, AuthResponse } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  errorMessage = '';
  isLoading = false;
  welcomeMessage = '';
  welcomeRole: 'user' | 'admin' | '' = '';

  constructor(private readonly router: Router, private readonly authService: Auth) {}

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  onGoogleLogin(): void { console.log('Google login clicked'); }
  onLinkedInLogin(): void { console.log('LinkedIn login clicked'); }

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: AuthResponse) => {
        this.isLoading = false;
        const isAdmin = res.role === 'ADMIN';
        this.welcomeRole = isAdmin ? 'admin' : 'user';
        this.welcomeMessage = `Bienvenue, ${res.firstName}\u00a0! Connecté en tant qu'${isAdmin ? 'administrateur' : 'utilisateur'}.`;
        setTimeout(() => this.router.navigate([isAdmin ? '/admin' : '/dashboard']), 1800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur de connexion. Veuillez réessayer.';
      }
    });
  }
}
