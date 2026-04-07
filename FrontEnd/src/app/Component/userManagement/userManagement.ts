import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, of, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './userManagement.html',
  styleUrl: './userManagement.css'
})
export class UserManagementComponent implements OnInit {
  private authUrl = '/api/Auth';

  users: UserSummary[] = [];
  updatingRoleUserId: number | null = null;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (!this.authService.isAdmin) {
      this.router.navigateByUrl('/tasks');
      return;
    }

    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<UserSummary[]>(`${this.authUrl}/users`, this.authService.getAuthOptions()).pipe(
      tap((data) => {
        this.users = data.map((u) => ({
          ...u,
          role: (u.role ?? '').toUpperCase()
        }));
        this.cdr.detectChanges();
      }),
      catchError((err) => {
        this.errorMessage = err?.error || 'Không thể tải danh sách user.';
        this.cdr.detectChanges();
        return of([]);
      })
    ).subscribe();
  }

  updateUserRole(user: UserSummary, role: string): void {
    const nextRole = role.toUpperCase();
    if (nextRole !== 'USER' && nextRole !== 'ADMIN') {
      this.errorMessage = 'Role không hợp lệ.';
      return;
    }

    this.errorMessage = '';
    this.updatingRoleUserId = user.id;
    this.http.put<UserSummary>(
      `${this.authUrl}/users/${user.id}/role`,
      { role: nextRole },
      this.authService.getAuthOptions()
    ).pipe(
      tap((updatedUser) => {
        this.users = this.users.map((item) =>
          item.id === updatedUser.id
            ? { ...item, role: updatedUser.role.toUpperCase() }
            : item
        );
      }),
      catchError((err) => {
        this.errorMessage = err?.error || 'Không thể cập nhật role.';
        return of(null);
      }),
      finalize(() => {
        this.updatingRoleUserId = null;
        this.cdr.detectChanges();
      })
    ).subscribe();
  }
}
