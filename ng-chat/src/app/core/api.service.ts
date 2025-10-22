import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  users() {
    return this.http.get<{ username: string }[]>(
      `${environment.apiBase}/users`,
      this.auth.authHeader()
    );
  }
  getMessages(withUser: string) {
    return this.http.get<any[]>(
      `${environment.apiBase}/messages?with=${encodeURIComponent(withUser)}`,
      this.auth.authHeader()
    );
  }
  sendMessage(to: string, text: string) {
    return this.http.post<any>(
      `${environment.apiBase}/messages`,
      { to, text },
      this.auth.authHeader()
    );
  }
  saveSubscription(subscription: PushSubscription) {
    return this.http.post(
      `${environment.apiBase}/push/subscribe`,
      { subscription },
      this.auth.authHeader()
    );
  }
}
