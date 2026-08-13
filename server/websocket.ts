import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '../src/types';
import { hospitalDb } from './db';

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  role?: string;
  departmentId?: string;
  patientId?: string;
  isAlive: boolean;
}

export class HospitalWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const clientInfo: ConnectedClient = {
        ws,
        id: clientId,
        isAlive: true
      };
      this.clients.set(ws, clientInfo);

      // Send initial state immediately
      const initialPayload: WebSocketMessage = {
        type: 'INIT_STATE',
        payload: {
          cases: hospitalDb.getCases(),
          queue: hospitalDb.getQueue(),
          departments: hospitalDb.getDepartments(),
          doctors: hospitalDb.getDoctors(),
          notifications: hospitalDb.getNotifications(),
          metrics: hospitalDb.getHospitalMetrics()
        }
      };

      try {
        ws.send(JSON.stringify(initialPayload));
      } catch (err) {
        console.error('Failed to send initial WS state:', err);
      }

      ws.on('pong', () => {
        const c = this.clients.get(ws);
        if (c) c.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'REGISTER_ROLE') {
            const client = this.clients.get(ws);
            if (client) {
              client.role = parsed.role;
              client.departmentId = parsed.departmentId;
              client.patientId = parsed.patientId;
            }
          } else if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch {
          // ignore malformed ws messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });

    // Heartbeat check every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        client.isAlive = false;
        try {
          ws.ping();
        } catch {
          this.clients.delete(ws);
        }
      });
    }, 25000);
  }

  public broadcast(message: WebSocketMessage) {
    if (!this.wss) return;
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(data);
        } catch (err) {
          console.error('Error broadcasting WS message:', err);
        }
      }
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.wss) this.wss.close();
  }
}

export const wsManager = new HospitalWebSocketManager();
