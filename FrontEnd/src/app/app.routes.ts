import { Routes } from '@angular/router';
import { LoginComponent } from './Component/auth/login/login';
import { ForgotPasswordComponent } from './Component/auth/forgot-password/forgot-password';
import { RegisterComponent } from './Component/auth/register/register';
import { TaskManagementComponent } from './Component/taskManagement/taskManagement';
import { UserManagementComponent } from './Component/userManagement/userManagement';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'tasks', component: TaskManagementComponent },
  { path: 'users', component: UserManagementComponent }
];
