import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { AuthPayload, AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authUrl = '/api/Auth';

  form = {
    email: '',
    password: ''
  };

  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  login(): void {
    this.errorMessage = '';
    if (!this.form.email.trim() || !this.form.password.trim()) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu.';
      return;
    }

    this.http.post<AuthPayload>(`${this.authUrl}/login`, this.form).pipe(
      tap((res) => {
        this.authService.applyAuth(res);
        this.router.navigateByUrl('/tasks');
      }),
      catchError((err) => {
        this.errorMessage = err?.error || 'Đăng nhập thất bại.';
        return of(null);
      })
    ).subscribe();
  }
}
