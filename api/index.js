import app from './serverApp.js';

// Vercel serverless function entrypoint.
// Exports the Express application instance as default.
// IMPORTANT: Do NOT call app.listen() here — Vercel executes serverless functions on demand.
export default app;
