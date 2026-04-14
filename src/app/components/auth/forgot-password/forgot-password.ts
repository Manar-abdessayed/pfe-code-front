import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  email: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Password reset requested for:', this.email);
    // Logique d'envoi d'email ici
    alert('Un lien de réinitialisation a été envoyé à votre adresse email.');
    this.router.navigate(['/login']);
  }
}