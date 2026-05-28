import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware for POST requests
  app.use(express.json());

  // API proxy route to handle Google Apps Script fetches without CORS blocks
  app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        const trimmed = text.trim();
        if (trimmed.startsWith('<') || text.toLowerCase().includes('doctype html') || text.toLowerCase().includes('google-signin')) {
          return res.status(502).json({
            status: 'error',
            message: 'Google Apps Script mengembalikan halaman HTML (Akses Terbatas/Login Google). Silakan deploy ulang Web App Anda di Google Sheets, lalu pilih "Who has access (Yang memiliki akses)" -> "Anyone (Siapa saja)" agar database dapat terhubung secara lancar bray!'
          });
        }
        return res.status(502).json({
          status: 'error',
          message: 'Respons dari Google Apps Script bukan format JSON yang valid.',
          details: text.slice(0, 300)
        });
      }
    } catch (err: any) {
      console.error('Proxy GET Error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/proxy', async (req, res) => {
    const { url, body } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        const trimmed = text.trim();
        if (trimmed.startsWith('<') || text.toLowerCase().includes('doctype html') || text.toLowerCase().includes('google-signin')) {
          return res.status(502).json({
            status: 'error',
            message: 'Google Apps Script mengembalikan halaman HTML (Akses Terbatas/Login Google). Silakan deploy ulang Web App Anda di Google Sheets, pilih "Who has access (Yang memiliki akses)" -> "Anyone (Siapa saja)".'
          });
        }
        return res.status(502).json({
          status: 'error',
          message: 'Respons dari Google Apps Script bukan format JSON yang valid.',
          details: text.slice(0, 300)
        });
      }
    } catch (err: any) {
      console.error('Proxy POST Error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
