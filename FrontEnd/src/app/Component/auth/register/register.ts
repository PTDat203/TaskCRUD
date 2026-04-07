import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import {
  AuthPayload,
  AuthService,
  getFirstApiErrorMessage,
  isValidEmailFormat
} from '../../../services/auth.service';

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
    password: '',
    confirmPassword: ''
  };

  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  /** Độ dài mật khẩu không tính khoảng trắng (giống backend). */
  private passwordEffectiveLength(value: string): number {
    return [...value].filter((c) => !/\s/.test(c)).length;
  }

  register(): void {
    this.errorMessage = '';
    if (
      !this.form.name.trim() ||
      !this.form.email.trim() ||
      !this.form.password ||
      !this.form.confirmPassword
    ) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }

    if (!isValidEmailFormat(this.form.email)) {
      this.errorMessage = 'Email không đúng định dạng.';
      return;
    }

    if (this.passwordEffectiveLength(this.form.password) < 8) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 8 ký tự (không tính khoảng trắng).';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    const payload = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      password: this.form.password,
      confirmPassword: this.form.confirmPassword
    };

    this.http.post<AuthPayload>(`${this.authUrl}/register`, payload).pipe(
      tap((res) => {
        this.authService.applyAuth(res);
        this.router.navigateByUrl('/tasks');
      }),
      catchError((err) => {
        if (err?.status === 409) {
          this.errorMessage = getFirstApiErrorMessage(err, 'Email đã được sử dụng.');
          return of(null);
        }
        this.errorMessage = getFirstApiErrorMessage(err, 'Đăng ký thất bại.');
        return of(null);
      })
    ).subscribe();
  }
}
