// Avisos em tempo real (mensagens, presentes, pedidos, pedidos de amizade...) por WebSocket.
// O React Native já tem WebSocket embutido, então o app não precisa de nenhum pacote.
// O app conecta em  wss://SEU-DOMINIO/ws?token=TOKEN_DE_ACESSO  e recebe { type, data }.
// Implementação mínima do protocolo (RFC 6455), só mensagens de texto.
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frame(text) {
  const payload = Buffer.from(text);
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x81;
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x81;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}

export class Hub {
  constructor() {
    this.clients = new Map(); // userId -> Set<socket>
  }

  // Liga o WebSocket ao servidor HTTP. authenticate(token) devolve o userId ou null.
  attach(server, authenticate) {
    server.on('upgrade', (req, socket) => {
      const url = new URL(req.url, 'http://x');
      const key = req.headers['sec-websocket-key'];
      const userId = url.pathname === '/ws' && key ? authenticate(url.searchParams.get('token')) : null;
      if (!userId) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return;
      }
      const accept = createHash('sha1').update(key + GUID).digest('base64');
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      socket.setNoDelay(true);
      this.add(userId, socket);
      let buf = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          const op = buf[0] & 0x0f;
          let len = buf[1] & 0x7f;
          let off = 2;
          if (len === 126) {
            if (buf.length < 4) return;
            len = buf.readUInt16BE(2);
            off = 4;
          } else if (len === 127) {
            if (buf.length < 10) return;
            len = Number(buf.readBigUInt64BE(2));
            off = 10;
          }
          const masked = buf[1] & 0x80;
          const total = off + (masked ? 4 : 0) + len;
          if (buf.length < total) return;
          const mask = masked ? buf.subarray(off, off + 4) : null;
          const data = Buffer.from(buf.subarray(off + (masked ? 4 : 0), total));
          if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
          buf = buf.subarray(total);
          if (op === 0x8) return socket.end(Buffer.from([0x88, 0]));
          if (op === 0x9) socket.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); // ping → pong
          if (op === 0x1 && data.toString() === 'ping') socket.write(frame('{"type":"pong"}'));
        }
      });
      const drop = () => this.remove(userId, socket);
      socket.on('close', drop);
      socket.on('error', drop);
      socket.write(frame(JSON.stringify({ type: 'ready' })));
    });
  }

  add(userId, socket) {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId).add(socket);
  }
  remove(userId, socket) {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(socket);
    if (!set.size) this.clients.delete(userId);
  }
  online(userId) {
    return this.clients.has(userId);
  }
  // Envia um aviso para todos os aparelhos conectados de uma pessoa.
  send(userId, type, data) {
    const set = this.clients.get(userId);
    if (!set) return;
    const f = frame(JSON.stringify({ type, data, at: Date.now() }));
    for (const s of set) {
      try {
        s.write(f);
      } catch (e) {}
    }
  }
  closeAll() {
    for (const set of this.clients.values()) for (const s of set) s.destroy();
    this.clients.clear();
  }
}
