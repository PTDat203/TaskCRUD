import { AfterViewInit, ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import {
  AuthPayload,
  AuthService,
  getFirstApiErrorMessage,
  isValidEmailFormat
} from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements AfterViewInit {
  private authUrl = '/api/Auth';
  private authAbsoluteUrl = 'https://localhost:7167/api/Auth';
  private googleClientId = '705210796305-vgtq1ktp47ui5in07pgmgsd2k9fcjag6.apps.googleusercontent.com';

  form = {
    email: '',
    password: ''
  };

  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.waitForGoogleAndRender();
  }

  login(): void {
    this.errorMessage = '';
    if (!this.form.email.trim() || !this.form.password.trim()) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu.';
      return;
    }

    if (!isValidEmailFormat(this.form.email)) {
      this.errorMessage = 'Email không đúng định dạng.';
      return;
    }

    this.http.post<AuthPayload>(`${this.authUrl}/login`, this.form).pipe(
      tap((res) => {
        this.authService.applyAuth(res);
        this.router.navigateByUrl('/tasks');
      }),
      catchError((err) => {
        this.errorMessage = err.error || 'Đăng nhập thất bại.';
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe();
  }

  private waitForGoogleAndRender(): void {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        window.clearInterval(timer);
        this.renderGoogleButton(g);
        return;
      }
      if (Date.now() - start > 5000) {
        window.clearInterval(timer);
        this.errorMessage = 'Không tải được Google Identity Services. Vui lòng refresh trang.';
      }
    }, 200);
  }

  private renderGoogleButton(g: any): void {

    g.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: { credential?: string }) => {
        this.ngZone.run(() => {
          const idToken = response?.credential ?? '';
          if (!idToken) return;
          this.loginWithGoogle(idToken);
        });
      }
    });

    const el = document.getElementById('googleBtn');
    if (!el) return;

    g.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      width: 380
    });
  }

  private loginWithGoogle(idToken: string): void {
    this.errorMessage = '';
    this.ngZone.run(() => {
      this.http.post<AuthPayload>(`${this.authAbsoluteUrl}/google-login`, { idToken }).pipe(
        tap((res) => {
          this.authService.applyAuth(res);
          this.router.navigateByUrl('/tasks');
        }),
        catchError((err) => {
          this.errorMessage = err.error || getFirstApiErrorMessage(err, 'Đăng nhập Google thất bại.');
          this.cdr.detectChanges();
          return of(null);
        })
      ).subscribe();
    });
  }
}
