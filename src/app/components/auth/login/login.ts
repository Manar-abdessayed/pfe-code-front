import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private readonly router: Router, private readonly authService: Auth) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onGoogleLogin() {
    console.log('Google login clicked');
  }

  onLinkedInLogin() {
    console.log('LinkedIn login clicked');
  }

  onSubmit() {
    this.errorMessage = '';
    this.isLoading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur de connexion. Veuillez réessayer.';
      }
    });
  }
}
