import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  token: string | null = localStorage.getItem('token');
  username: string | null = localStorage.getItem('username');
  vapidPublicKey: string | null = localStorage.getItem('vapidPublicKey');

  get isLogged() {
    return !!this.token;
  }

  async login(username: string) {
    const res: any = await this.http
      .post(`${environment.apiBase}/auth/login`, { username })
      .toPromise();
    this.token = res.token;
    this.username = res.username;
    this.vapidPublicKey = res.vapidPublicKey;
    localStorage.setItem('token', this.token!);
    localStorage.setItem('username', this.username!);
    localStorage.setItem('vapidPublicKey', this.vapidPublicKey!);
  }

  authHeader() {
    return { headers: { Authorization: `Bearer ${this.token}` } };
  }
}
