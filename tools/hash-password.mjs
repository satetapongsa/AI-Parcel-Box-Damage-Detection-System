// Prints a DASHBOARD_PASSWORD_HASH and a SESSION_SECRET for dashboard login.
// Usage:  node tools/hash-password.mjs            (asks for the password, input hidden)
import { randomBytes } from 'crypto';
import readline from 'readline';
import { hashPassword } from '../dashboard/lib/password.js';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(s);
    };
    rl.question(question, (a) => {
      rl.close();
      process.stdout.write('\n');
      resolve(a);
    });
  });
}

const pw = await ask('New dashboard password (min 12 characters): ');
if (pw.length < 12) {
  console.error('Too short: use at least 12 characters.');
  process.exit(1);
}
console.log('\nPut these in dashboard/.env.local and in Vercel -> Settings -> Environment Variables:\n');
console.log(`DASHBOARD_PASSWORD_HASH=${await hashPassword(pw)}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
