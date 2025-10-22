import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: ` <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
  >
    <div class="w-full max-w-md mx-4">
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <div class="text-center mb-8">
          <div
            class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              ></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-800 mb-2">
            Benvenuto in PWA Chat
          </h1>
          <p class="text-slate-600">Inserisci il tuo username per iniziare</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Username</label
            >
            <input
              [(ngModel)]="username"
              placeholder="Il tuo username"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-slate-400"
              type="text"
              autocomplete="username"
            />
          </div>

          <button
            (click)="doLogin()"
            [disabled]="!username.trim()"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span class="flex items-center justify-center">
              <svg
                class="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                ></path>
              </svg>
              Entra nella chat
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>`,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private push = inject(PushService);
  username = '';

  async doLogin() {
    await this.auth.login(this.username.trim());
    await this.push.init(); // registra la subscription push
    this.router.navigateByUrl('/chat');
  }
}
