import { Injectable, Logger } from '@nestjs/common';

export interface PushPayload {
  userId: string;
  title: string;
  body: string;
}

export interface NotificationSender {
  send(payload: PushPayload): Promise<void>;
}

// No real push provider is wired yet — that needs a Firebase project (FCM)
// and Apple push certs, plus the Flutter app registering device tokens via
// user_devices, none of which exist yet. This just logs what would be sent,
// so the call site (NotificationsProcessor) doesn't have to change once a
// real sender is dropped in behind this same interface.
@Injectable()
export class ConsoleNotificationSender implements NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  async send(payload: PushPayload): Promise<void> {
    this.logger.log(`[push:not-configured] would notify user ${payload.userId}: "${payload.title}" — ${payload.body}`);
  }
}
