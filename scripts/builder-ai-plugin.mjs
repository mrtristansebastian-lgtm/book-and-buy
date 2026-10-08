// Development-only bridge using the signed-in Codex ChatGPT account.
import { BuilderCodexClient } from './builder-codex-client.mjs';
const allowedOrigin = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;

function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function builderAIPlugin() {
  return {
    name: 'bookbuy-local-builder-ai',
    configureServer(server) {
      const codex = new BuilderCodexClient();
      server.httpServer?.on('close', () => codex.close());
      server.middlewares.use('/api/builder', async (req, res) => {
        const origin = req.headers.origin;
        if (!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '') || (origin && (!allowedOrigin.test(origin) || new URL(origin).host !== req.headers.host)) || (req.method === 'POST' && !origin)) return reply(res, 403, { error: 'Local requests only.' });
        const controller = new AbortController();
        res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        const timer = setTimeout(() => controller.abort(), 180000);
        try {
          if (req.url === '/codex/health' && req.method === 'GET') return reply(res, 200, await codex.health());
          if (req.url === '/codex/login' && req.method === 'POST') {
            const login = await codex.login();
            return reply(res, 200, { authUrl: login.authUrl, loginId: login.loginId });
          }
          if (req.url !== '/codex/chat' || req.method !== 'POST') return reply(res, 404, { error: 'Unknown AI operation.' });
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 240000) return reply(res, 413, { error: 'That request is too long for local testing.' });
          }
          let input;
          try { input = JSON.parse(body); } catch { return reply(res, 400, { error: 'Invalid AI request.' }); }
          if (typeof input.model !== 'string' || !/^[\w.:-]{1,100}$/.test(input.model) || !Array.isArray(input.messages) || input.messages.length > 3 || input.messages.some(message => !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || message.content.length > 180000) || !input.format || typeof input.format !== 'object') {
            return reply(res, 400, { error: 'Invalid AI request.' });
          }
          if (input.conversationId != null && !/^[a-zA-Z0-9-]{1,80}$/.test(input.conversationId)) return reply(res, 400, { error: 'Invalid conversation.' });
          if (input.effort != null && !['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(input.effort)) return reply(res, 400, { error: 'Invalid thinking level.' });
          if (req.url === '/codex/chat' && input.stream) {
            res.statusCode = 200; res.setHeader('Content-Type', 'application/x-ndjson'); res.setHeader('Cache-Control', 'no-store'); res.flushHeaders();
            const emit = event => { if (!res.destroyed) res.write(JSON.stringify(event) + '\n'); };
            try { emit({ type: 'activity', text: 'Reviewing your request and connected app data…' }); emit({ type: 'complete', result: await codex.generate(input, controller.signal, emit) }); }
            catch (error) { emit({ type: 'error', error: error.message }); }
            res.end(); return;
          }
          if (req.url === '/codex/chat') return reply(res, 200, await codex.generate(input, controller.signal));
        } catch (error) {
          if (!res.destroyed) reply(res, 503, { error: error.message || 'The AI connection is unavailable. Reconnect to try again.' });
        } finally { clearTimeout(timer); }
      });
    }
  };
}
