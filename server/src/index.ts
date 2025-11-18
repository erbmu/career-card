import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cardsRouter from './routes/cards.js';
import aiRouter from './routes/ai.js';

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : undefined;

app.use(
  cors({
    origin: allowedOrigins ?? '*',
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '15mb',
  })
);

app.use('/api/cards', cardsRouter);
app.use('/api/ai', aiRouter);

const clientDistPath = path.resolve(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? 'Internal server error' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Career Card API listening on port ${port}`);
});
