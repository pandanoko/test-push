import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private swPush = inject(SwPush);
  private auth = inject(AuthService);
  private api = inject(ApiService);

  async testBasicNotification(): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔔 === DEBUG NOTIFICHE ===');
    console.log('1. Controllo supporto browser...');
    
    // Controlla se le notifiche sono supportate
    if (!('Notification' in window)) {
      console.log('❌ Notifiche NON supportate');
      return {
        success: false,
        message: 'Le notifiche non sono supportate da questo browser',
      };
    }
    console.log('✅ Notifiche supportate dal browser');

    // Controlla lo stato attuale dei permessi
    let permission = Notification.permission;
    console.log('2. Stato permesso attuale:', permission);

    // Se non ancora richiesto, richiedi il permesso
    if (permission === 'default') {
      console.log('3. Richiedo permesso...');
      permission = await Notification.requestPermission();
      console.log('4. Nuovo permesso dopo richiesta:', permission);
    }

    if (permission === 'denied') {
      console.log('❌ Permesso negato');
      return {
        success: false,
        message:
          'Le notifiche sono state bloccate. Per abilitarle:\n1. Clicca sull\'icona del lucchetto nella barra degli indirizzi\n2. Imposta le notifiche su "Consenti"\n3. Ricarica la pagina',
      };
    }

    if (permission === 'granted') {
      console.log('✅ Permesso concesso - Creo notifica...');
      try {
        console.log('5. Creo oggetto Notification...');
        const notification = new Notification('Test Chat App', {
          body: 'Le notifiche del browser funzionano! 🎉',
          tag: 'test-notification',
        });

        console.log('6. Notifica creata:', notification);
        console.log('7. Stato notifica:', {
          title: notification.title,
          body: notification.body,
          tag: notification.tag
        });

        notification.onclick = () => {
          console.log('🎯 Notifica cliccata!');
          window.focus();
          notification.close();
        };

        notification.onshow = () => {
          console.log('👁️ Notifica mostrata!');
        };

        notification.onerror = (error) => {
          console.log('💥 Errore notifica:', error);
        };

        notification.onclose = () => {
          console.log('❌ Notifica chiusa');
        };

        // Auto-chiudi dopo 5 secondi
        setTimeout(() => {
          console.log('⏰ Auto-chiusura notifica');
          notification.close();
        }, 5000);

        console.log('✅ Notifica dovrebbe essere visibile ora!');
        return {
          success: true,
          message: 'Notifica inviata con successo!',
        };
      } catch (error) {
        console.error('💥 Errore creazione notifica:', error);
        return {
          success: false,
          message: 'Errore nella creazione della notifica: ' + error,
        };
      }
    }

    console.log('❓ Stato permesso sconosciuto:', permission);
    return {
      success: false,
      message: 'Stato permesso sconosciuto: ' + permission,
    };
  }

  async showMessageNotification(from: string, text: string): Promise<boolean> {
    console.log('📱 === DEBUG NOTIFICA MESSAGGIO ===');
    console.log('1. Da:', from, 'Testo:', text);
    console.log('2. Permesso notifiche:', Notification.permission);
    console.log('3. Finestra in focus:', document.hasFocus());
    
    // Mostra notifica solo se i permessi sono attivi e la finestra non è in focus
    if (Notification.permission !== 'granted') {
      console.log('❌ Permesso non concesso');
      return false;
    }
    
    if (document.hasFocus()) {
      console.log('❌ Finestra in focus - non mostro notifica');
      return false;
    }

    try {
      console.log('4. Creo notifica messaggio...');
      const notification = new Notification(`Nuovo messaggio da ${from}`, {
        body: text,
        tag: `msg-${from}`,
        requireInteraction: false,
      });

      console.log('5. Notifica messaggio creata:', notification);

      notification.onclick = () => {
        console.log('🎯 Notifica messaggio cliccata!');
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('👁️ Notifica messaggio mostrata!');
      };

      notification.onerror = (error) => {
        console.log('💥 Errore notifica messaggio:', error);
      };

      // Auto-chiudi dopo 5 secondi
      setTimeout(() => {
        console.log('⏰ Auto-chiusura notifica messaggio');
        notification.close();
      }, 5000);

      console.log(`✅ Notifica mostrata per messaggio da ${from}`);
      return true;
    } catch (error) {
      console.error('💥 Errore creazione notifica messaggio:', error);
      return false;
    }
  }

  async init() {
    console.log('PushService init - SW enabled:', this.swPush.isEnabled);

    // Test notifica base prima
    const testResult = await this.testBasicNotification();
    console.log('Test notifica risultato:', testResult);

    if (!this.swPush.isEnabled) {
      console.warn(
        'Service Worker non abilitato - push avanzate non disponibili'
      );
      return;
    }

    const pub = this.auth.vapidPublicKey!;
    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: pub,
      });
      await this.api.saveSubscription(sub).toPromise();
      // opzionale: eventi di click su notifica
      this.swPush.notificationClicks.subscribe((event) => {
        // qui potresti navigare verso la chat con event.notification.data?.from
      });
    } catch (e) {
      console.warn('Push non attivata:', e);
    }
  }
}
