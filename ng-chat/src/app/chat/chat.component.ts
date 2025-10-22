import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PushService } from '../core/push.service';
import { WebSocketService, WebSocketMessage } from '../core/websocket.service';
import { Subscription } from 'rxjs';

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
              <div class="text-xs flex items-center">
                <span 
                  class="w-2 h-2 rounded-full mr-2"
                  [class.bg-green-500]="isWebSocketConnected()"
                  [class.bg-red-500]="!isWebSocketConnected()"
                ></span>
                <span 
                  [class.text-green-500]="isWebSocketConnected()"
                  [class.text-red-500]="!isWebSocketConnected()"
                >
                  {{ isWebSocketConnected() ? 'Real-time' : 'Disconnected' }}
                </span>
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
export class ChatComponent implements OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private pushService = inject(PushService);
  private wsService = inject(WebSocketService);
  
  me = this.auth.username!;
  users: { username: string }[] = [];
  messages: any[] = [];
  text = '';
  withUser = signal<string | null>(null);
  showMobileSidebar = false;
  isWebSocketConnected = signal<boolean>(false);

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor() {
    this.refreshUsers();
    this.initializeWebSocket();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Disconnect WebSocket
    this.wsService.disconnect();
  }

  /**
   * Initialize WebSocket connection and listeners
   */
  private initializeWebSocket(): void {
    console.log('🔌 Initializing WebSocket in ChatComponent');
    
    // Connect to WebSocket
    this.wsService.connect();

    // Listen for connection status changes
    const connectionSub = this.wsService.getConnectionStatus().subscribe(
      (connected) => {
        console.log('🔌 WebSocket connection status:', connected);
        this.isWebSocketConnected.set(connected);
        
        if (connected) {
          console.log('✅ WebSocket connected - real-time messaging enabled');
          // Load messages for current conversation when connected
          const currentUser = this.withUser();
          if (currentUser) {
            this.reloadMessages();
          }
        } else {
          console.log('❌ WebSocket disconnected - falling back to HTTP polling');
          // Could implement HTTP polling fallback here if needed
        }
      }
    );

    // Listen for WebSocket messages
    const messageSub = this.wsService.getMessages().subscribe(
      (wsMessage: WebSocketMessage) => {
        console.log('📨 WebSocket message received in ChatComponent:', wsMessage);
        
        switch (wsMessage.type) {
          case 'connected':
            console.log('✅ WebSocket connection confirmed');
            break;
            
          case 'new_message':
            this.handleNewMessage(wsMessage.message);
            break;
            
          case 'message_sent':
            console.log('✅ Message sent confirmation:', wsMessage.messageId);
            // Optionally update UI to show message as sent
            break;
            
          case 'error':
            console.error('💥 WebSocket error:', wsMessage.error);
            break;
        }
      }
    );

    this.subscriptions.push(connectionSub, messageSub);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleNewMessage(message: any): void {
    console.log('💬 Handling new message:', message);
    
    const currentUser = this.withUser();
    
    // Check if message is for current conversation
    if (currentUser && 
        ((message.from === currentUser && message.to === this.me) ||
         (message.from === this.me && message.to === currentUser))) {
      
      // Check if message already exists (avoid duplicates)
      const messageExists = this.messages.some(m => 
        m.id === message.id || 
        (m.from === message.from && m.to === message.to && m.ts === message.ts && m.text === message.text)
      );
      
      if (!messageExists) {
        console.log('📝 Adding new message to conversation');
        this.messages.push(message);
        this.messages.sort((a, b) => a.ts - b.ts); // Keep messages sorted by timestamp
        
        // Show browser notification if message is from someone else and window not focused
        if (message.from !== this.me && !document.hasFocus()) {
          console.log('🔔 Showing notification for new message');
          this.pushService.showMessageNotification(message.from, message.text);
        }
      } else {
        console.log('⚠️ Message already exists, skipping');
      }
    } else {
      console.log('ℹ️ Message not for current conversation, ignoring');
    }
  }

  refreshUsers() {
    this.api.users().subscribe((u) => (this.users = u));
  }
  
  select(u: string) {
    console.log('👤 Selecting user:', u);
    this.withUser.set(u);
    // Load messages for the selected conversation
    this.reloadMessages();
  }

  selectMobile(u: string) {
    this.select(u);
    this.showMobileSidebar = false;
  }
  /**
   * Load messages for current conversation from API
   * This is now used primarily for initial load and when WebSocket is not available
   */
  reloadMessages() {
    const u = this.withUser();
    if (!u) return;

    console.log('📨 Loading messages for conversation with:', u);
    this.api.getMessages(u).subscribe((msgs) => {
      console.log('📨 Received', msgs.length, 'messages from API');
      this.messages = msgs;
    });
  }
  /**
   * Send message - try WebSocket first, fallback to HTTP
   */
  send() {
    const u = this.withUser();
    if (!u || !this.text.trim()) return;

    const messageText = this.text.trim();
    console.log('📤 Sending message to:', u, 'Text:', messageText);

    // Try WebSocket first
    if (this.isWebSocketConnected() && this.wsService.sendMessage(u, messageText)) {
      console.log('✅ Message sent via WebSocket');
      this.text = '';
      
      // Add message to local state immediately for better UX
      const tempMessage = {
        id: `temp-${Date.now()}`,
        from: this.me,
        to: u,
        text: messageText,
        ts: Date.now()
      };
      this.messages.push(tempMessage);
    } else {
      // Fallback to HTTP API
      console.log('📡 Falling back to HTTP API for message sending');
      this.api.sendMessage(u, messageText).subscribe((m) => {
        console.log('✅ Message sent via HTTP:', m);
        this.text = '';
        // Add message to local state
        this.messages.push(m);
        this.messages.sort((a, b) => a.ts - b.ts);
      });
    }
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

  // Debug methods for testing notifications
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
}
