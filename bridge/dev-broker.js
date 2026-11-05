'use strict';
/**
 * Backup MQTT broker written in Node.js (aedes) — use when Mosquitto is not installed.
 *   node dev-broker.js            -> listens on 0.0.0.0:1883
 *   BROKER_HOST=127.0.0.1 node dev-broker.js   -> local machine only
 * Anonymous access, no persistence: for demos only.
 */
const net = require('net');

const PORT = Number(process.env.BROKER_PORT) || 1883;
const HOST = process.env.BROKER_HOST || '0.0.0.0';

async function main() {
  const { Aedes } = await import('aedes'); // aedes v1 is ESM-only
  const broker = await Aedes.createBroker();
  const server = net.createServer(broker.handle);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Another broker (e.g. the Mosquitto Windows service) already owns the port.
      // Keep this process alive so `concurrently -k` does not stop the bridge/dashboard.
      console.log(`ℹ️  port ${PORT} is already used by another MQTT broker (e.g. Mosquitto) — using that one instead.`);
      setInterval(() => {}, 1 << 30);
      return;
    }
    console.error('❌ broker error:', err.message);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    console.log(`🛰️  SPDI dev broker (aedes) listening on mqtt://${HOST}:${PORT}  (Ctrl+C to stop)`);
  });

  broker.on('client', (c) => console.log(`   + client ${c ? c.id : '?'}`));
  broker.on('clientDisconnect', (c) => console.log(`   - client ${c ? c.id : '?'}`));

  const stop = () => {
    server.close();
    broker.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
