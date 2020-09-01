import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import winston from 'express-winston';

import type { SSL, SSLBuffer, Server } from '../shared/interfaces';
import { favicon, redirect } from './socketServer/middleware';
import { html } from './socketServer/html';
import { listen } from './socketServer/socket';
import { logger } from '../shared/logger';
import { serveStatic, trim } from './socketServer/assets';
import { loadSSL } from './socketServer/ssl';

export async function server(
  { base, port, host, title, bypassHelmet }: Server,
  ssl?: SSL,
): Promise<SocketIO.Server> {
  const basePath = trim(base);
  logger.info('Starting server', {
    ssl,
    port,
    base,
    title,
  });

  const app = express();
  app
    .use(`${basePath}/web_modules`, serveStatic('web_modules'))
    .use(`${basePath}/assets`, serveStatic('assets'))
    .use(`${basePath}/client`, serveStatic('client'))
    .use(winston.logger(logger))
    .use(compression())
    .use(favicon)
    .use(redirect);

  // Allow helmet to be bypassed.
  // Unfortunately, order matters with middleware
  // which is why this is thrown in the middle
  if (!bypassHelmet) {
    app.use(helmet());
  }

  const client = html(basePath, title);
  app.get(basePath, client).get(`${basePath}/ssh/:user`, client);

  const sslBuffer: SSLBuffer = await loadSSL(ssl);

  return listen(app, host, port, basePath, sslBuffer);
}
