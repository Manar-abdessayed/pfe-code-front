import { Component, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxCaptchaModule, ReCaptcha2Component } from 'ngx-captcha';
import { Auth, AuthResponse } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, NgxCaptchaModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  @ViewChild('captchaElem') captchaElem!: ReCaptcha2Component;

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  errorMessage = '';
  isLoading = false;
  welcomeMessage = '';
  welcomeRole: 'user' | 'admin' | '' = '';

  // Replace with your real site key from https://www.google.com/recaptcha/admin
  readonly siteKey = '6Ld6ZCUtAAAAAKE13d2xHHsPAIcq5Em__0uLw8Hf';
  captchaToken: string | null = null;
  captchaError = false;

  constructor(private readonly router: Router, private readonly authService: Auth) {}

  handleCaptchaSuccess(token: string): void {
    this.captchaToken = token;
    this.captchaError = false;
  }

  handleCaptchaExpire(): void {
    this.captchaToken = null;
  }

  resetCaptcha(): void {
    this.captchaToken = null;
    this.captchaError = false;
    if (this.captchaElem) {
      this.captchaElem.resetCaptcha();
    }
  }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (!this.captchaToken) {
      this.captchaError = true;
      return;
    }

    this.errorMessage = '';
    this.captchaError = false;
    this.isLoading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: AuthResponse) => {
        this.isLoading = false;
        const isAdmin = res.role === 'ADMIN';
        this.welcomeRole = isAdmin ? 'admin' : 'user';
        this.welcomeMessage = `Bienvenue, ${res.firstName} ! Connecté en tant qu'${isAdmin ? 'administrateur' : 'utilisateur'}.`;
        setTimeout(() => this.router.navigate([isAdmin ? '/admin' : '/dashboard']), 1800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur de connexion. Veuillez réessayer.';
        this.resetCaptcha();
      }
    });
  }
}
