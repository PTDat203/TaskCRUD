import { Routes } from '@angular/router';
import { TaskCrudComponent } from './Component/taskCrud/taskCrud';

export const routes: Routes = [
  { path: '', redirectTo: '/task-crud', pathMatch: 'full' },
  { path: 'task-crud', component: TaskCrudComponent }
];
