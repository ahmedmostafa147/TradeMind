import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { isMeaningfulChange, normalizeSymbol, Quote } from '../entities/quote.entity';

/**
 * Pushes prices to connected clients.
 *
 * **BROADCASTS ONLY WHEN SOMETHING CHANGED.** The poller runs on a timer and
 * returns the same candle most of the time — a gateway that forwards every poll
 * sends the whole book every interval to tell every client nothing happened.
 * The last broadcast value per symbol is kept here and compared before sending.
 *
 * Rooms per symbol, so a client watching two positions is not woken by the
 * other twenty-eight the poller tracks.
 */
@WebSocketGateway({
  namespace: '/market',
  cors: { origin: '*' },
})
export class MarketDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(MarketDataGateway.name);
  private readonly lastBroadcast = new Map<string, Quote>();

  handleConnection(client: Socket): void {
    this.logger.debug(`client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { symbols?: string[] },
  ): { subscribed: string[] } {
    const symbols = (body?.symbols ?? [])
      .map(normalizeSymbol)
      .filter((s) => /^[A-Z0-9]{2,12}$/.test(s))
      .slice(0, 50);

    for (const symbol of symbols) {
      void client.join(symbol);
      // The current value immediately, so a client that connects between two
      // ticks is not left with an empty screen until the next one.
      const last = this.lastBroadcast.get(symbol);
      if (last !== undefined) client.emit('quote', serialize(last));
    }

    return { subscribed: symbols };
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { symbols?: string[] },
  ): { unsubscribed: string[] } {
    const symbols = (body?.symbols ?? []).map(normalizeSymbol);
    for (const symbol of symbols) void client.leave(symbol);
    return { unsubscribed: symbols };
  }

  /** Called by the poller and by a streaming provider alike. */
  publish(quote: Quote): void {
    const symbol = normalizeSymbol(quote.symbol);
    if (!isMeaningfulChange(this.lastBroadcast.get(symbol), quote)) return;

    this.lastBroadcast.set(symbol, quote);
    // Optional-chained: the server is undefined until Nest has bound the
    // adapter, and the first poll can land before that.
    this.server?.to(symbol).emit('quote', serialize(quote));
  }

  publishMany(quotes: Quote[]): void {
    for (const quote of quotes) this.publish(quote);
  }

  /** Told to everyone, because it changes how every price should be read. */
  publishStatus(state: string, activeProvider: string | null): void {
    this.server?.emit('status', { state, activeProvider });
  }
}

const serialize = (quote: Quote) => ({
  ...quote,
  asOf: quote.asOf.toISOString(),
});
