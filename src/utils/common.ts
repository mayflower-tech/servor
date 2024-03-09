import fs from 'node:fs';
import os, { NetworkInterfaceInfo } from 'node:os';
import net from 'node:net';
import chokidar from 'chokidar';

// recursive function that checks if a file is still changing
const awaitWriteFinish = (path: fs.PathLike, prev: { mtimeNs: bigint }, cb: () => void) => {
  fs.stat(path, { bigint: true }, (err, stat) => {
    if (err) {
      throw err;
    }
    if (stat.mtimeNs === prev.mtimeNs) {
      cb();
    } else {
      setTimeout(awaitWriteFinish, 50, path, stat, cb);
    }
  });
};

export const fileWatch = (
  x: string | readonly string[],
  cb: () => void
) => {
  if ('Deno' in globalThis) {
    (async () => {
      for await (const iterator of (globalThis as any).Deno.watchFs(x, { recursive: true })) {
        cb();
      }
    })();
  } else {
    chokidar.watch(x).on('all', cb);
  }
};

export const usePort = (port?: number, host?: string) =>
  new Promise<number>((ok, x) => {
    const s = net.createServer();
    s.on('error', x);
    s.listen(port, host, undefined, () => {
      const a = s.address();
      s.close(() => (a && typeof a === 'object' ? ok(a.port) : void 0));
    });
  });

export const networkIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((i): i is NetworkInterfaceInfo => i?.family === 'IPv4' && i?.internal === false)
  .map((i) => i.address);
