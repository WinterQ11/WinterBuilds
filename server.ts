import app, { isServerless, cleanOldTempChunks } from './src/serverApp.ts';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

async function startServer() {
  // Ensure container reverse proxy allows large APK uploads if nginx is present
  try {
    const nginxConfPath = '/etc/nginx/nginx.conf';
    if (fs.existsSync(nginxConfPath)) {
      let conf = fs.readFileSync(nginxConfPath, 'utf8');
      if (conf.includes('client_max_body_size 32M;')) {
        conf = conf.replace(/client_max_body_size\s+32M;/g, 'client_max_body_size 250M;');
        fs.writeFileSync(nginxConfPath, conf, 'utf8');
        try {
          const { exec } = await import('child_process');
          exec('nginx -s reload');
        } catch {}
      }
    }
  } catch {}

  // Periodic cleanup of stale temporary chunk uploads (in persistent container runtimes)
  if (!isServerless) {
    cleanOldTempChunks();
    setInterval(cleanOldTempChunks, 30 * 60 * 1000);
  }

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WinterBuild server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
