import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

export interface AuthPayload {
  token: string;
  name: string;
  email: string;
  role: string;
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
