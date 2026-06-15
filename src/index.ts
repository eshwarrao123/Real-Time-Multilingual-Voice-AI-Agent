import 'dotenv/config';
import http from 'http';
import { initWebSocketServer } from './websocket/wsServer';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Voice Appointment Bot is running.\n');
});

initWebSocketServer(server);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
