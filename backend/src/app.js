import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import citizenRoutes from './routes/citizens.js';
import caseRoutes from './routes/cases.js';
import screeningRoutes from './routes/screenings.js';
import checkInRoutes from './routes/checkIns.js';
import chatRoutes from './routes/chat.js';
import caseEventRoutes from './routes/caseEvents.js';
import alertRoutes from './routes/alerts.js';
import interventionRoutes from './routes/interventions.js';

export const app = express();

// The prototype uses bearer tokens rather than browser cookies, so credentials
// are not required. Reflecting the caller's Origin avoids deployment failures
// when a preview/custom Vercel domain is used.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin) || config.nodeEnv !== 'production') {
      return callback(null, true);
    }
    // Keep the prototype usable with Vercel/Render preview URLs while still
    // preserving an explicit allow-list for production configuration.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'raksha-setu-backend' });
});

app.use('/auth', authRoutes);
app.use('/citizens', citizenRoutes);
app.use('/cases', caseRoutes);
app.use('/screenings', screeningRoutes);
app.use('/check-ins', checkInRoutes);
app.use('/chat', chatRoutes);
app.use('/case-events', caseEventRoutes);
app.use('/alerts', alertRoutes);
app.use('/interventions', interventionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);
