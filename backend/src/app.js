import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import citizenRoutes from './routes/citizens.js';
import caseRoutes from './routes/cases.js';
import screeningRoutes from './routes/screenings.js';
import checkInRoutes from './routes/checkIns.js';
import caseEventRoutes from './routes/caseEvents.js';
import alertRoutes from './routes/alerts.js';
import interventionRoutes from './routes/interventions.js';

export const app = express();

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
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
app.use('/case-events', caseEventRoutes);
app.use('/alerts', alertRoutes);
app.use('/interventions', interventionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);
