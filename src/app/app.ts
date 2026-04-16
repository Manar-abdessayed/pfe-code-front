import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('invest-ia');

  constructor(public router: Router) {}

  get isAuthRoute(): boolean {
    const authRoutes = ['/login', '/register', '/forgot-password'];
    return authRoutes.some(route => this.router.url.startsWith(route));
  }
}
