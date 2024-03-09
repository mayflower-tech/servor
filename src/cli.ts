#!/usr/bin/env node
import fs from 'node:fs';
import { servor } from './servor.ts';
import openBrowser from './utils/openBrowser.ts';
import { program } from 'commander';
import { fileURLToPath } from "node:url";
import process from "node:process";

const readCredentials = () => ({
  cert: fs.readFileSync(new URL('servor.crt', import.meta.url)),
  key: fs.readFileSync(new URL('servor.key', import.meta.url)),
});

const certify = () =>
  require('child_process').execSync(new URL('../certify.sh', import.meta.url), {
    cwd: fileURLToPath(import.meta.url),
  });

(async () => {
  // Parse arguments from the command line
  program
    .arguments('[root]')
    .option('-f, --fallback <fallback>', 'fallback file', 'index.html')
    .option('-p, --port <port>', 'port to use', '8080')
    .option('-r, --reload', 'reload on file change')
    .option('-m, --module', 'serve javascript modules')
    .option('-s, --static', 'serve static files')
    .option('--secure', 'use https')
    .option('-b, --browse', 'open browser on start')
    .option('--host <host>', 'host to listen on')
    .option('--dir-listing', 'enable directory listing')
    .option('--silent', 'disable console output')
    .parse(process.argv);

  const opts = program.opts();
  const argsRoot = program.args[0];
  const fallback = opts.fallback;
  const argsPort = opts.port;

  const admin = process.getuid && process.getuid() === 0;
  let credentials;

  // Generate ssl certificates

  if (opts.secure) {
    admin && certify();
    admin && process.platform === 'darwin' && process.setuid?.(501);
    try {
      credentials = readCredentials();
    } catch (e) {
      certify();
      try {
        credentials = readCredentials();
      } catch (e) {
        console.log('\n  ⚠️  There was a problem generating ssl credentials. Try removing `--secure`\n');
        process.exit();
      }
    }
  }

  const { root, protocol, port, ips, url } = await servor({
    root: argsRoot,
    fallback,
    port: argsPort,
    reload: opts.reload,
    module: opts.module,
    static: opts.static,
    host: opts.host,
    noDirListing: !opts.dirListing,
    credentials,
  });

  // Output server details to the console

  !opts.silent &&
    console.log(`
  🗂  Serving:\t${root}\n
  🏡 Local:\t${url}
  ${ips.map((ip) => `📡 Network:\t${protocol}://${ip}:${port}`).join('\n  ')}
  `);

  // Browser the server index

  !!opts.browse && openBrowser(url);
})();
