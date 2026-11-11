// Uploads the built website (dist/) to Hostinger over FTPS.
//
//   npm run deploy
//
// `predeploy` builds the site first. You are asked for the FTP password each time; it is never
// saved. Optional environment variables: FTP_HOST, FTP_USER, FTP_DIR, FTP_PASSWORD.
// Files are uploaded with index.html and 404.html last, so visitors never get a page whose
// scripts are not uploaded yet. Nothing on the server is deleted.

import { Client } from 'basic-ftp';
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { checkServerIdentity } from 'node:tls';

const HOST = process.env.FTP_HOST || '147.93.17.97';
const USER = process.env.FTP_USER || 'u850683157';
const REMOTE_DIR = (process.env.FTP_DIR || 'public_html').replace(/\/+$/, '');
const LOCAL_DIR = 'dist';
const LAST = ['index.html', '404.html']; // uploaded after everything else

/** Reads the password without showing it on screen. */
function askPassword(prompt) {
  if (process.env.FTP_PASSWORD) return Promise.resolve(process.env.FTP_PASSWORD);
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) { reject(new Error('Run this in a terminal, or set FTP_PASSWORD.')); return; }
    stdout.write(prompt);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); stdout.write('\n');
          resolve(value); return;
        }
        if (char === '\u0003') { stdout.write('\n'); process.exit(130); } // Ctrl+C
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

async function connect(client, password) {
  await client.access({
    host: HOST,
    user: USER,
    password,
    secure: true, // explicit FTPS: password and files are encrypted
    secureOptions: {
      rejectUnauthorized: true,
      // Hostinger's FTP certificate is issued for *.hstgr.io. Connecting by IP, so require a valid
      // certificate for that name: proves this is the genuine Hostinger server.
      checkServerIdentity: (_host, cert) => checkServerIdentity('ftp.hstgr.io', cert),
    },
  });
}

if (!existsSync(join(LOCAL_DIR, 'index.html'))) {
  console.error('dist/index.html is missing. Run "npm run build" first (npm run deploy does this).');
  process.exit(1);
}
// public/.htaccess serves 404.html (with a 404 status) for unknown URLs.
copyFileSync(join(LOCAL_DIR, 'index.html'), join(LOCAL_DIR, '404.html'));

const files = listFiles(LOCAL_DIR)
  .map((path) => relative(LOCAL_DIR, path).split(sep).join(posix.sep))
  .sort((a, b) => LAST.indexOf(a) - LAST.indexOf(b) || a.localeCompare(b));

const password = await askPassword(`FTP password for ${USER}@${HOST}: `);
const client = new Client(60_000);
try {
  await connect(client, password);
  const home = await client.pwd();
  // Main FTP accounts start in the account home (which contains public_html); FTP accounts
  // created for the site folder start inside public_html already.
  const names = (await client.list()).map((item) => item.name);
  const root = names.includes(REMOTE_DIR) || process.env.FTP_DIR ? posix.join(home, REMOTE_DIR) : home;
  if (!names.includes(REMOTE_DIR) && !names.includes('.htaccess') && !names.includes('index.html') && !process.env.FTP_DIR) {
    throw new Error(`Could not find the website folder (no ${REMOTE_DIR}/ or index.html in ${home}). Set FTP_DIR.`);
  }
  console.log(`Connected. Uploading ${files.length} files to ${root}/`);

  let done = 0;
  for (const file of files) {
    const remote = posix.join(root, file);
    for (let attempt = 1; ; attempt += 1) {
      try {
        await client.ensureDir(posix.dirname(remote));
        await client.uploadFrom(join(LOCAL_DIR, file), remote);
        break;
      } catch (error) {
        // Hostinger occasionally resets the data connection: reconnect and retry this file.
        if (attempt >= 3) throw error;
        console.warn(`  retrying ${file} (${error.message})`);
        client.close();
        await connect(client, password);
      }
    }
    done += 1;
    if (done % 10 === 0 || done === files.length) console.log(`  ${done}/${files.length}`);
  }
  console.log('Deploy finished: https://sthenofy.com (press Ctrl+F5 if you see the old version).');
} catch (error) {
  console.error(`\nDeploy failed: ${error.message}`);
  if (/530|login/i.test(error.message)) console.error('Check the FTP password (hPanel -> Files -> FTP Accounts).');
  process.exitCode = 1;
} finally {
  client.close();
}
