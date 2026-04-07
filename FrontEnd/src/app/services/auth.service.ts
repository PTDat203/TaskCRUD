import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

export interface AuthPayload {
  token: string;
  name: string;
  email: string;
  role: string;
}

/** Kiểm tra định dạng email cơ bản (local@domain). */
export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Lấy message lỗi từ API (chuỗi thuần hoặc validation ProblemDetails). */
export function getFirstApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { error?: unknown };
  if (typeof e?.error === 'string' && e.error.trim()) return e.error;
  const errors = (e?.error as { errors?: Record<string, string[]> })?.errors;
  if (errors && typeof errors === 'object') {
    for (const key of Object.keys(errors)) {
      const arr = errors[key];
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') return arr[0];
    }
  }
  return fallback;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  token = '';
  name = '';
  email = '';
  role = '';

  constructor() {
    this.restore();
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get isAdmin(): boolean {
    return this.role.toUpperCase() === 'ADMIN';
  }

  applyAuth(payload: AuthPayload): void {
    this.token = payload.token;
    this.name = payload.name;
    this.email = payload.email;
    this.role = payload.role;

    localStorage.setItem('token', payload.token);
    localStorage.setItem('name', payload.name);
    localStorage.setItem('email', payload.email);
    localStorage.setItem('role', payload.role);
  }

  logout(): void {
    this.token = '';
    this.name = '';
    this.email = '';
    this.role = '';

    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }

  getAuthOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.token}`
      })
    };
  }

  private restore(): void {
    this.token = localStorage.getItem('token') ?? '';
    this.name = localStorage.getItem('name') ?? '';
    this.email = localStorage.getItem('email') ?? '';
    this.role = localStorage.getItem('role') ?? '';
  }
}
