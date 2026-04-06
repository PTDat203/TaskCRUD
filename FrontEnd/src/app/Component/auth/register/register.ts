import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { AuthPayload, AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private authUrl = '/api/Auth';

  form = {
    name: '',
    email: '',
    password: ''
  };

  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  register(): void {
    this.errorMessage = '';
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.password.trim()) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    this.http.post<AuthPayload>(`${this.authUrl}/register`, this.form).pipe(
      tap((res) => {
        this.authService.applyAuth(res);
        this.router.navigateByUrl('/tasks');
      }),
      catchError((err) => {
        this.errorMessage = err?.error || 'Đăng ký thất bại.';
        return of(null);
      })
    ).subscribe();
  }
}
