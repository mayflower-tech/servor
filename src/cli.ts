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
    .arguments('[root] [fallback] [port]')
    .option('-r, --reload', 'reload on file change')
    .option('-m, --module', 'serve javascript modules')
    .option('-s, --static', 'serve static files')
    .option('--secure', 'use https')
    .option('-b, --browse', 'open browser on start')
    .option('--localhost-only', 'only serve on localhost')
    .option('--no-dir-listing', 'disable directory listing')
    .option('--silent', 'disable console output')
    .option('--editor', 'open code editor')
    .parse(process.argv);

  const opts = program.opts();
  const argsRoot = program.args[0];
  const fallback = program.args[1];
  const argsPort = program.args[2];

  // const args = process.argv.slice(2).filter((x) => !~x.indexOf('--'));
  const admin = process.getuid && process.getuid() === 0;
  let credentials;

  // if (args[0] && args[0].startsWith('gh:')) {
  //   const repo = args[0].replace('gh:', '');
  //   const dest = repo.split('/')[1];
  //   if (!fs.existsSync(dest)) {
  //     try {
  //       require('child_process').execSync(`git clone https://github.com/${repo}`, { stdio: 'ignore' });
  //     } catch (e) {
  //       console.log(`\n  ⚠️  Could not clone from https://github.com/${repo}\n`);
  //       process.exit();
  //     }
  //   }
  //   args[0] = dest;
  // }

  if (opts.editor) {
    try {
      require('child_process').execSync(`code ${argsRoot || '.'}`);
    } catch (e) {
      console.log(`\n  ⚠️  Could not open code editor for ${argsRoot || '.'}`);
    }
  }

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
    reload: !!opts.reload,
    module: !!opts.module,
    static: !!opts.static,
    host: !!opts.localhostOnly ? '127.0.0.1' : undefined,
    noDirListing: !!opts.noDirListing,
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
