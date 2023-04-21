#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { servor } from './servor';
import openBrowser from './utils/openBrowser';
import { program } from 'commander';

const readCredentials = () => ({
  cert: fs.readFileSync(__dirname + '/servor.crt'),
  key: fs.readFileSync(__dirname + '/servor.key'),
});

const certify = () =>
  require('child_process').execSync(path.resolve(__dirname, '../certify.sh'), {
    cwd: __dirname,
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
