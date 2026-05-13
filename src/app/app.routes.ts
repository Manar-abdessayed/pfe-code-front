import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { RegisterComponent } from './components/auth/register/register';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password';
import { DashboardComponent } from './components/pages/dashboard/dashboard';
import { ProfileComponent } from './components/pages/profile/profile';
import { PortfolioComponent } from './components/pages/portfolio/portfolio';
import { SettingsComponent } from './components/pages/settings/settings';
import { AssistantComponent } from './components/pages/assistant/assistant';
import { AdminSupervisionComponent } from './components/admin/supervision/admin-supervision';
import { AdminUsersComponent } from './components/admin/users/admin-users';
import { AdminConfigComponent } from './components/admin/config/admin-config';
import { RecommendationsComponent } from './components/pages/recommendations/recommendations';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'assistant', component: AssistantComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'recommendations', component: RecommendationsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'admin', component: AdminSupervisionComponent },
  { path: 'admin/users', component: AdminUsersComponent },
  { path: 'admin/config', component: AdminConfigComponent },
];
