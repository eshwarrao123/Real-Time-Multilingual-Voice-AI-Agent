import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { handleConnection } from './wsHandler';

export function initWebSocketServer(server: http.Server): void {
    const wss = new WebSocketServer({ server });

    console.log('🔌 WebSocket server initialized');

    wss.on('connection', (socket: WebSocket) => {
        console.log('📞 New client connected');
        handleConnection(socket);
    });

    wss.on('error', (err) => {
        console.error('WebSocket server error:', err.message);
    });
}
