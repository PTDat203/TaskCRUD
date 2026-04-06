import { Routes } from '@angular/router';
import { LoginComponent } from './Component/auth/login/login';
import { RegisterComponent } from './Component/auth/register/register';
import { TaskManagementComponent } from './Component/taskManagement/taskManagement';
import { UserManagementComponent } from './Component/userManagement/userManagement';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'tasks', component: TaskManagementComponent },
  { path: 'users', component: UserManagementComponent }
];
