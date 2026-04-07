import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  step = 1; // 1: nhập email, 2: nhập code, 3: reset password, 4: success
  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  resetToken = '';

  message = '';
  errorMessage = '';

  private baseUrl = '/api/password';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  sendCode(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.email.trim()) {
      this.errorMessage = 'Vui lòng nhập email';
      this.cdr.detectChanges();
      return;
    }

    // Chuyển sang step 2 ngay, không đợi response
    this.step = 2;
    this.message = 'Mã xác thực đã được gửi đến email. Vui lòng kiểm tra hộp thư.';
    this.cdr.detectChanges();

    // Gửi request ngầm
    this.http.post<string>(`${this.baseUrl}/forgot`, { email: this.email }, { responseType: 'text' as 'json' }).subscribe({
      error: err => {
        this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Gửi mã thất bại');
        this.cdr.detectChanges();
      }
    });
  }

  verifyCode(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.code.trim()) {
      this.errorMessage = 'Vui lòng nhập mã';
      this.cdr.detectChanges();
      return;
    }

    this.http.post<{ resetToken: string; message?: string }>(`${this.baseUrl}/verify`, { email: this.email, code: this.code }).subscribe({
      next: res => {
        this.resetToken = res.resetToken;
        this.step = 3;
        this.message = res.message || 'Mã hợp lệ. Vui lòng nhập mật khẩu mới';
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Xác thực thất bại');
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword(): void {
    this.errorMessage = '';
    this.message = '';
    if (!this.newPassword.trim()) {
      this.errorMessage = 'Vui lòng nhập mật khẩu mới';
      this.cdr.detectChanges();
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp';
      this.cdr.detectChanges();
      return;
    }

    this.http.post<string>(`${this.baseUrl}/reset`, {
      email: this.email,
      resetToken: this.resetToken,
      newPassword: this.newPassword
    }, { responseType: 'text' as 'json' }).subscribe({
      next: () => {
        this.step = 4;
        this.message = 'Đổi mật khẩu thành công. Đang chuyển về đăng nhập...';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: err => {
        this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Đổi mật khẩu thất bại');
        this.cdr.detectChanges();
      }
    });
  }
}