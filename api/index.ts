import app from '../src/serverApp.ts';

// Vercel serverless function entrypoint.
// Exports the Express application instance as default.
// IMPORTANT: Do NOT call app.listen() here â€” Vercel executes serverless functions on demand.
export default app;
