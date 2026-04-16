import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { RegisterComponent } from './components/auth/register/register';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password';
import { DashboardComponent } from './components/pages/dashboard/dashboard';
import { ProfileComponent } from './components/pages/profile/profile';
import { PortfolioComponent } from './components/pages/portfolio/portfolio';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'portfolio', component: PortfolioComponent },
];
