'use client';

import { getPoolBalance } from './poolWallet';

// Admin notification configuration
const ADMIN_CONFIG = {
  webhookUrl: process.env.NEXT_PUBLIC_ADMIN_WEBHOOK || '', 
  emailEndpoint: process.env.NEXT_PUBLIC_ADMIN_EMAIL_API || '',
  phoneNumber: process.env.NEXT_PUBLIC_ADMIN_PHONE || '',
  lowBalanceThreshold: 50,
  criticalBalanceThreshold: 20,
  minReserveBalance: 10,
};

// Notification types
export type NotificationType = 'low_balance' | 'critical_balance' | 'insufficient_funds' | 'pool_refill_needed';

// Notification data interface
interface NotificationData {
  type: NotificationType;
  poolBalance: number;
  threshold: number;
  timestamp: string;
  severity: 'warning' | 'critical' | 'emergency';
  actionRequired: string;
  estimatedRefillAmount: number;
}

// Admin notification service
export class AdminNotificationService {
  private static instance: AdminNotificationService;
  private sentNotifications: Set<string> = new Set();
  private notificationCooldown: Map<NotificationType, number> = new Map();

  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  // Send notification to admin
  async sendNotification(data: NotificationData): Promise<void> {
    const notificationKey = `${data.type}_${Math.floor(data.poolBalance)}`;
    const now = Date.now();
    
    // Check cooldown to avoid spam (5 minutes for same notification type)
    const lastSent = this.notificationCooldown.get(data.type) || 0;
    if (now - lastSent < 300000) { // 5 minutes
      return;
    }

    try {
      // Log to console (always available)
      this.logToConsole(data);
      
      // Send to multiple channels in parallel
      const promises = [
        this.sendWebhookNotification(data),
        this.sendEmailNotification(data),
        this.sendBrowserNotification(data),
      ];

      // Don't block if notifications fail
      await Promise.allSettled(promises);
      
      // Update cooldown
      this.notificationCooldown.set(data.type, now);
      this.sentNotifications.add(notificationKey);
      
    } catch (error) {
      console.error('Admin notification failed:', error);
    }
  }

  // Check pool status and send appropriate notifications
  async checkAndNotify(): Promise<void> {
    try {
      const balance = await getPoolBalance();
      const now = new Date().toISOString();

      if (balance < ADMIN_CONFIG.minReserveBalance) {
        await this.sendNotification({
          type: 'insufficient_funds',
          poolBalance: balance,
          threshold: ADMIN_CONFIG.minReserveBalance,
          timestamp: now,
          severity: 'emergency',
          actionRequired: 'IMMEDIATE_POOL_REFILL_REQUIRED',
          estimatedRefillAmount: 200 - balance,
        });
      } else if (balance < ADMIN_CONFIG.criticalBalanceThreshold) {
        await this.sendNotification({
          type: 'critical_balance',
          poolBalance: balance,
          threshold: ADMIN_CONFIG.criticalBalanceThreshold,
          timestamp: now,
          severity: 'critical',
          actionRequired: 'URGENT_POOL_REFILL_NEEDED',
          estimatedRefillAmount: 150 - balance,
        });
      } else if (balance < ADMIN_CONFIG.lowBalanceThreshold) {
        await this.sendNotification({
          type: 'low_balance',
          poolBalance: balance,
          threshold: ADMIN_CONFIG.lowBalanceThreshold,
          timestamp: now,
          severity: 'warning',
          actionRequired: 'SCHEDULE_POOL_REFILL',
          estimatedRefillAmount: 100 - balance,
        });
      }
    } catch (error) {
      console.error('Pool check failed:', error);
    }
  }

  // Log notification to console
  private logToConsole(data: NotificationData): void {
    const emoji = data.severity === 'emergency' ? '🚨' : data.severity === 'critical' ? '⚠️' : '💡';
    const message = `${emoji} ADMIN ALERT [${data.severity.toUpperCase()}] - ${data.type.replace('_', ' ').toUpperCase()}`;
    
    console.group(message);
    console.error(`Pool Balance: ${data.poolBalance.toFixed(4)} MON`);
    console.error(`Threshold: ${data.threshold} MON`);
    console.error(`Action Required: ${data.actionRequired}`);
    console.error(`Estimated Refill: ${data.estimatedRefillAmount.toFixed(4)} MON`);
    console.error(`Timestamp: ${data.timestamp}`);
    console.groupEnd();
  }

  // Send webhook notification (Discord/Slack/Teams)
  private async sendWebhookNotification(data: NotificationData): Promise<void> {
    if (!ADMIN_CONFIG.webhookUrl) return;

    try {
      const message = {
        content: `🚨 **POOL ALERT** - ${data.type.replace('_', ' ').toUpperCase()}`,
        embeds: [{
          title: `${data.severity === 'emergency' ? '🚨' : data.severity === 'critical' ? '⚠️' : '💡'} Pool Balance Alert`,
          color: data.severity === 'emergency' ? 0xFF0000 : data.severity === 'critical' ? 0xFF8000 : 0xFFFF00,
          fields: [
            { name: 'Current Balance', value: `${data.poolBalance.toFixed(4)} MON`, inline: true },
            { name: 'Threshold', value: `${data.threshold} MON`, inline: true },
            { name: 'Refill Needed', value: `${data.estimatedRefillAmount.toFixed(4)} MON`, inline: true },
            { name: 'Action Required', value: data.actionRequired, inline: false },
          ],
          timestamp: data.timestamp,
          footer: { text: 'Monad Synapse Casino Pool Monitor' }
        }]
      };

      await fetch(ADMIN_CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  // Send email notification
  private async sendEmailNotification(data: NotificationData): Promise<void> {
    if (!ADMIN_CONFIG.emailEndpoint) return;

    try {
      const subject = `🚨 Pool Alert: ${data.type.replace('_', ' ').toUpperCase()}`;
      const body = `
        Pool Balance Alert - ${data.severity.toUpperCase()}
        
        Current Pool Balance: ${data.poolBalance.toFixed(4)} MON
        Alert Threshold: ${data.threshold} MON
        Recommended Refill: ${data.estimatedRefillAmount.toFixed(4)} MON
        
        Action Required: ${data.actionRequired}
        
        Timestamp: ${data.timestamp}
        
        Please refill the pool wallet immediately to ensure continuous casino operations.
      `;

      await fetch(ADMIN_CONFIG.emailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, severity: data.severity }),
      });
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }

  // Send browser notification
  private async sendBrowserNotification(data: NotificationData): Promise<void> {
    if (!('Notification' in window)) return;

    try {
      if (Notification.permission === 'granted') {
        new Notification(`Pool Alert: ${data.type.replace('_', ' ').toUpperCase()}`, {
          body: `Balance: ${data.poolBalance.toFixed(4)} MON - ${data.actionRequired}`,
          icon: '/favicon.ico',
          tag: data.type,
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await this.sendBrowserNotification(data);
        }
      }
    } catch (error) {
      console.error('Browser notification failed:', error);
    }
  }

  // Manual notification for testing
  async testNotification(): Promise<void> {
    await this.sendNotification({
      type: 'low_balance',
      poolBalance: 45,
      threshold: 50,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      actionRequired: 'TEST_NOTIFICATION',
      estimatedRefillAmount: 55,
    });
  }
}

// Export singleton instance
export const adminNotifications = AdminNotificationService.getInstance();

// Auto-start monitoring when module loads
if (typeof window !== 'undefined') {
  // Check every 60 seconds
  setInterval(() => {
    adminNotifications.checkAndNotify();
  }, 60000);

  // Initial check after 5 seconds
  setTimeout(() => {
    adminNotifications.checkAndNotify();
  }, 5000);
}