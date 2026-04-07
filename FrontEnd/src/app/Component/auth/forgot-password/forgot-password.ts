import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule], // <-- FE Module điền ở đây
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  step = 1; // 1: nhập email, 2: nhập code, 3: reset password
  email = '';
  code = '';
  newPassword = '';
  resetToken = '';

  message = '';
  errorMessage = '';

  private baseUrl = '/api/password';

  constructor(private http: HttpClient) {}

  sendCode(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.email.trim()) {
      this.errorMessage = 'Vui lòng nhập email';
      return;
    }
  
    this.http.post<{ message: string }>(`${this.baseUrl}/forgot`, { email: this.email }).subscribe({
      next: res => {
        this.step = 2; // chuyển sang verify code
        this.message = res.message || 'Mã xác thực đã được gửi đến email';
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Gửi mã thất bại';
      }
    });
  }

  verifyCode(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.code.trim()) {
      this.errorMessage = 'Vui lòng nhập mã';
      return;
    }
  
    this.http.post<{ resetToken: string, message?: string }>(`${this.baseUrl}/verify`, { email: this.email, code: this.code })
      .subscribe({
        next: res => {
          this.resetToken = res.resetToken;
          this.step = 3;
          this.message = res.message || 'Mã hợp lệ. Vui lòng nhập mật khẩu mới';
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Xác thực thất bại';
        }
      });
  }

  resetPassword(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.newPassword.trim()) {
      this.errorMessage = 'Vui lòng nhập mật khẩu mới';
      return;
    }

    this.http.post(`${this.baseUrl}/reset`, {
      email: this.email,
      resetToken: this.resetToken,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.message = 'Đổi mật khẩu thành công';
        this.step = 1;
        this.email = '';
        this.code = '';
        this.newPassword = '';
      },
      error: err => this.errorMessage = err.error?.message || 'Đổi mật khẩu thất bại'
    });
  }
}