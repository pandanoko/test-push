import { Injectable, inject } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface WebSocketMessage {
  type: 'connected' | 'new_message' | 'message_sent' | 'error';
  message?: any;
  username?: string;
  messageId?: string;
  timestamp?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket?: WebSocket;
  private messageSubject = new Subject<WebSocketMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private auth = inject(AuthService);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isIntentionallyClosed = false;
  private reconnectTimer?: any;

  constructor() {
    console.log('🔌 WebSocketService created');
  }

  /**
   * Establishes WebSocket connection with JWT authentication
   */
  connect(): void {
    console.log('🔌 Attempting WebSocket connection...');
    this.isIntentionallyClosed = false;
    const token = this.auth.token;
    
    if (!token) {
      console.error('❌ No token available for WebSocket connection');
      return;
    }

    try {
      // Connect to WebSocket with JWT token as query parameter
      const wsUrl = `ws://localhost:3000?token=${encodeURIComponent(token)}`;
      console.log('🔗 Connecting to:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        
        // Clear any pending reconnection timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = undefined;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          // Emit the message to subscribers
          this.messageSubject.next(data);
        } catch (error) {
          console.error('💥 Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`❌ WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        this.connectionStatusSubject.next(false);
        
        // Only attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.attemptReconnection();
        }
      };

      this.socket.onerror = (error) => {
        console.error('💥 WebSocket error:', error);
        this.connectionStatusSubject.next(false);
      };

    } catch (error) {
      console.error('💥 Failed to create WebSocket connection:', error);
      this.attemptReconnection();
    }
  }

  /**
   * Sends a chat message via WebSocket
   */
  sendMessage(to: string, text: string): boolean {
    if (!this.isConnected()) {
      console.error('❌ WebSocket not connected, cannot send message');
      return false;
    }

    const message = {
      type: 'chat_message',
      to,
      text
    };

    console.log('📤 Sending message via WebSocket:', message);
    this.socket!.send(JSON.stringify(message));
    return true;
  }

  /**
   * Observable stream of WebSocket messages
   */
  getMessages(): Observable<WebSocketMessage> {
    return this.messageSubject.asObservable();
  }

  /**
   * Observable stream of connection status
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Gracefully disconnect WebSocket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    this.isIntentionallyClosed = true;
    
    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Close socket if open
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = undefined;
    }
    
    this.connectionStatusSubject.next(false);
  }

  /**
   * Attempts to reconnect with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.isIntentionallyClosed) {
      console.log('🛑 Not reconnecting - intentionally closed');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`🚫 Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.messageSubject.next({
        type: 'error',
        error: 'Max reconnection attempts reached'
      });
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect();
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
        this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
      }
    }, this.reconnectInterval);
  }
}