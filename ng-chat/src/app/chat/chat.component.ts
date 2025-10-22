import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  template: `
    <div class="h-screen flex bg-slate-50">
      <!-- Sidebar utenti -->
      <div
        class="w-80 md:flex hidden bg-white border-r border-slate-200 flex-col"
      >
        <!-- Header sidebar -->
        <div class="p-6 border-b border-slate-200 bg-slate-50">
          <div class="flex items-center space-x-3 mb-4">
            <div
              class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <span class="text-white font-semibold text-sm">{{
                me.charAt(0).toUpperCase()
              }}</span>
            </div>
            <div>
              <div class="font-semibold text-slate-800">{{ me }}</div>
              <div class="text-xs text-slate-500">Online</div>
            </div>
          </div>
          <div class="text-sm font-medium text-slate-700 mb-2">
            Utenti disponibili
          </div>
          <div class="text-xs text-slate-500">
            Seleziona un utente per iniziare a chattare
          </div>
        </div>

        <!-- Lista utenti -->
        <div class="flex-1 overflow-y-auto p-3 space-y-1">
          <div
            *ngFor="let u of users"
            (click)="select(u.username)"
            class="p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-slate-100 group"
            [class.bg-blue-50]="u.username === withUser()"
            [class.border-blue-200]="u.username === withUser()"
            [class.border]="u.username === withUser()"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center group-hover:bg-slate-400 transition-colors"
                [class.bg-blue-500]="u.username === withUser()"
                [class.text-white]="u.username === withUser()"
              >
                <span class="text-xs font-semibold">{{
                  u.username.charAt(0).toUpperCase()
                }}</span>
              </div>
              <div class="flex-1">
                <div
                  class="font-medium text-slate-800"
                  [class.text-blue-700]="u.username === withUser()"
                >
                  {{ u.username }}
                </div>
                <div class="text-xs text-slate-500">Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Area chat -->
      <div class="flex-1 flex flex-col">
        <!-- Header chat -->
        <div class="bg-white border-b border-slate-200 p-4 shadow-sm">
          <!-- Bottone mobile per sidebar -->
          <div
            class="flex items-center space-x-3"
            *ngIf="withUser(); else noUserSelected"
          >
            <button
              class="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              (click)="showMobileSidebar = true"
            >
              <svg
                class="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
            <div
              class="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center"
            >
              <span class="text-white font-semibold text-sm">{{
                withUser()!.charAt(0).toUpperCase()
              }}</span>
            </div>
            <div class="flex-1">
              <div class="font-semibold text-slate-800">{{ withUser() }}</div>
              <div class="text-xs text-green-500 flex items-center">
                <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Online
              </div>
            </div>
          </div>
          <ng-template #noUserSelected>
            <div class="text-center text-slate-500">
              <button
                class="md:hidden mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                (click)="showMobileSidebar = true"
              >
                Seleziona utente
              </button>
              <svg
                class="w-8 h-8 mx-auto mb-2 text-slate-400"
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
              <div class="font-medium">Seleziona un utente</div>
              <div class="text-sm">
                Scegli qualcuno dalla sidebar per iniziare una conversazione
              </div>
            </div>
          </ng-template>
        </div>

        <!-- Area messaggi -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50">
          <div
            *ngFor="let m of messages; trackBy: trackMessage"
            class="flex"
            [class.justify-end]="m.from === me"
          >
            <div
              class="max-w-xs lg:max-w-md"
              [class.order-1]="m.from === me"
              [class.order-2]="m.from !== me"
            >
              <div
                class="px-4 py-3 rounded-2xl shadow-sm border"
                [class.bg-blue-500]="m.from === me"
                [class.text-white]="m.from === me"
                [class.bg-white]="m.from !== me"
                [class.text-slate-800]="m.from !== me"
                [class.border-blue-500]="m.from === me"
                [class.border-slate-200]="m.from !== me"
              >
                <div
                  class="text-xs opacity-70 mb-1"
                  [class.text-blue-100]="m.from === me"
                  [class.text-slate-500]="m.from !== me"
                >
                  {{ m.from }} • {{ formatTime(m.timestamp) }}
                </div>
                <div class="leading-relaxed">{{ m.text }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form invio messaggio -->
        <div class="bg-white border-t border-slate-200 p-4">
          <!-- Pulsante test notifiche -->
          <button
            (click)="testNotification()"
            class="mb-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <span>🔔</span>
            <span>Test Notifica</span>
          </button>

          <!-- Pulsante test notifica forzata -->
          <button
            (click)="testForceNotification()"
            class="mb-3 ml-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
          >
            <span>🚨</span>
            <span>Forza Notifica</span>
          </button>

          <form class="flex space-x-3" (ngSubmit)="send()">
            <div class="flex-1 relative">
              <input
                [(ngModel)]="text"
                name="text"
                placeholder="Scrivi un messaggio..."
                class="w-full px-4 py-3 pr-12 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-slate-400"
                [disabled]="!withUser()"
                autocomplete="off"
              />
              <button
                type="submit"
                [disabled]="!withUser() || !text.trim()"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  ></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div
        *ngIf="showMobileSidebar"
        class="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
        (click)="showMobileSidebar = false"
      >
        <div
          class="w-80 bg-white h-full shadow-xl transform transition-transform duration-300"
          (click)="$event.stopPropagation()"
        >
          <!-- Header sidebar mobile -->
          <div class="p-6 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                >
                  <span class="text-white font-semibold text-sm">{{
                    me.charAt(0).toUpperCase()
                  }}</span>
                </div>
                <div>
                  <div class="font-semibold text-slate-800">{{ me }}</div>
                  <div class="text-xs text-slate-500">Online</div>
                </div>
              </div>
              <button
                (click)="showMobileSidebar = false"
                class="p-2 hover:bg-slate-200 rounded-lg"
              >
                <svg
                  class="w-5 h-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            <div class="text-sm font-medium text-slate-700 mb-2">
              Utenti disponibili
            </div>
            <div class="text-xs text-slate-500">
              Seleziona un utente per iniziare a chattare
            </div>
          </div>

          <!-- Lista utenti mobile -->
          <div class="flex-1 overflow-y-auto p-3 space-y-1">
            <div
              *ngFor="let u of users"
              (click)="selectMobile(u.username)"
              class="p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-slate-100 group"
              [class.bg-blue-50]="u.username === withUser()"
              [class.border-blue-200]="u.username === withUser()"
              [class.border]="u.username === withUser()"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center group-hover:bg-slate-400 transition-colors"
                  [class.bg-blue-500]="u.username === withUser()"
                  [class.text-white]="u.username === withUser()"
                >
                  <span class="text-xs font-semibold">{{
                    u.username.charAt(0).toUpperCase()
                  }}</span>
                </div>
                <div class="flex-1">
                  <div
                    class="font-medium text-slate-800"
                    [class.text-blue-700]="u.username === withUser()"
                  >
                    {{ u.username }}
                  </div>
                  <div class="text-xs text-slate-500">Online</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  imports: [CommonModule, FormsModule],
})
export class ChatComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private pushService = inject(PushService);
  me = this.auth.username!;
  users: { username: string }[] = [];
  messages: any[] = [];
  text = '';
  withUser = signal<string | null>(null);
  showMobileSidebar = false;

  // Per tracciare i messaggi esistenti e rilevare i nuovi
  private existingMessageIds = new Set<string>();

  constructor() {
    this.refreshUsers();
    // Polling minimale per nuovi messaggi (ogni 2s)
    setInterval(() => this.reloadMessages(), 2000);
  }

  refreshUsers() {
    this.api.users().subscribe((u) => (this.users = u));
  }
  select(u: string) {
    this.withUser.set(u);
    // Resetta gli ID dei messaggi esistenti quando cambi utente
    this.existingMessageIds.clear();
    this.reloadMessages();
  }

  selectMobile(u: string) {
    this.select(u);
    this.showMobileSidebar = false;
  }
  reloadMessages() {
    const u = this.withUser();
    if (!u) return;

    this.api.getMessages(u).subscribe((msgs) => {
      // Trova nuovi messaggi confrontando con gli ID esistenti
      const newMessages = msgs.filter((msg) => {
        const msgId = this.createMessageId(msg);
        return !this.existingMessageIds.has(msgId) && msg.from !== this.me;
      });

      // Mostra notifiche per i nuovi messaggi (solo se non sono da me)
      newMessages.forEach((msg) => {
        this.showMessageNotification(msg);
      });

      // Aggiorna il set degli ID esistenti
      this.existingMessageIds.clear();
      msgs.forEach((msg) => {
        this.existingMessageIds.add(this.createMessageId(msg));
      });

      this.messages = msgs;
    });
  }
  send() {
    const u = this.withUser();
    if (!u || !this.text.trim()) return;
    this.api.sendMessage(u, this.text.trim()).subscribe((m) => {
      this.text = '';
      this.reloadMessages();
    });
  }

  trackMessage(index: number, message: any): any {
    return message.id || index;
  }

  formatTime(timestamp: string | number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async testNotification() {
    console.log('Testing notification...');
    const result = await this.pushService.testBasicNotification();
    console.log('Test notifica risultato:', result);

    if (result.success) {
      alert(`✅ ${result.message}`);
    } else {
      alert(`❌ ${result.message}`);
    }
  }

  async testForceNotification() {
    console.log('🚨 FORZO UNA NOTIFICA - IGNORO TUTTE LE CONDIZIONI');
    
    if (Notification.permission !== 'granted') {
      alert('❌ Permessi non concessi. Clicca prima "Test Notifica"');
      return;
    }

    try {
      // Prova anche con un suono
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIcBSqG0fPTgjkNBIK+9sWRQQUXW7ng5Z9PFAlUnOMwwWUcBjqQ2O+2tI8FGCGnzOvUhzsIIHHI7N2Lq5w='); 
      audio.play().catch(() => {}); // Ignora errori audio

      const notification = new Notification('🚨 NOTIFICA FORZATA', {
        body: 'Questa notifica dovrebbe apparire SEMPRE se i permessi sono OK!',
        tag: 'force-test',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        requireInteraction: true  // Forza l'interazione
      });

      let notificationShown = false;

      notification.onclick = () => {
        console.log('Notifica forzata cliccata!');
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('✅ Notifica forzata MOSTRATA!');
        notificationShown = true;
        // Aspetta un po' prima di dire che è mostrata
        setTimeout(() => {
          if (notificationShown) {
            alert('✅ Notifica mostrata! Se non la vedi, controlla:\n1. Angolo in basso a destra\n2. Centro notifiche Windows\n3. Impostazioni Chrome');
          }
        }, 1000);
      };

      notification.onerror = (error) => {
        console.error('❌ Errore notifica forzata:', error);
        alert('❌ Errore nella notifica forzata: ' + error);
      };

      // Prova a vibrare se supportato
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      setTimeout(() => {
        if (!notificationShown) {
          alert('⚠️ La notifica è stata creata ma onshow non è stato chiamato. Problema del browser/sistema.');
        }
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('💥 Errore creazione notifica forzata:', error);
      alert('💥 Errore: ' + error);
    }
  }

  // Crea un ID univoco per ogni messaggio per rilevare i nuovi
  private createMessageId(message: any): string {
    return `${message.from}-${message.to}-${message.timestamp}-${message.text}`;
  }

  // Mostra notifica per un nuovo messaggio
  private async showMessageNotification(message: any) {
    console.log('💌 === DEBUG NOTIFICA NUOVO MESSAGGIO ===');
    console.log('1. Messaggio ricevuto:', message);
    console.log('2. Focus finestra:', document.hasFocus());
    console.log('3. È da me?', message.from === this.me);
    
    // Solo se la finestra non è in focus e il messaggio non è da me
    if (!document.hasFocus() && message.from !== this.me) {
      console.log('4. Condizioni OK - Mostro notifica...');
      const result = await this.pushService.showMessageNotification(message.from, message.text);
      console.log('5. Risultato notifica:', result);
    } else {
      console.log('4. Condizioni NON OK - NON mostro notifica');
      if (document.hasFocus()) console.log('   - Finestra in focus');
      if (message.from === this.me) console.log('   - Messaggio da me stesso');
    }
  }
}
