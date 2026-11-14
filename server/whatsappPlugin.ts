import type { Plugin, ViteDevServer } from 'vite';
import { whatsappStore } from './whatsappStore.ts';
import { whatsappQueueWorker } from './whatsappQueue.ts';
import type { CreateDispatchPayload } from './types.ts';
import url from 'url';

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function whatsappApiPlugin(): Plugin {
  return {
    name: 'whatsapp-cloud-api-backend',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';

        if (!pathname.startsWith('/api/whatsapp')) {
          return next();
        }

        // 1. GET /api/whatsapp/config
        if (req.method === 'GET' && pathname === '/api/whatsapp/config') {
          const config = whatsappStore.getConfig();
          // Mask access token for security
          const maskedToken = config.accessToken
            ? `${config.accessToken.slice(0, 6)}...${config.accessToken.slice(-4)}`
            : '';
          return sendJson(res, 200, {
            phoneNumberId: config.phoneNumberId,
            businessAccountId: config.businessAccountId,
            templateName: config.templateName,
            isConfigured: config.isConfigured,
            maskedToken,
          });
        }

        // 2. POST /api/whatsapp/config
        if (req.method === 'POST' && pathname === '/api/whatsapp/config') {
          const body = await parseJsonBody(req);
          const saved = whatsappStore.saveConfig({
            phoneNumberId: body.phoneNumberId?.trim(),
            accessToken: body.accessToken ? body.accessToken.trim() : undefined,
            businessAccountId: body.businessAccountId?.trim(),
            templateName: body.templateName?.trim(),
          });
          return sendJson(res, 200, {
            success: true,
            isConfigured: saved.isConfigured,
            message: 'WhatsApp API credentials updated securely on server.',
          });
        }

        // 3. POST /api/whatsapp/test
        if (req.method === 'POST' && pathname === '/api/whatsapp/test') {
          const body = await parseJsonBody(req);
          const config = whatsappStore.getConfig();
          const phoneId = body.phoneNumberId?.trim() || config.phoneNumberId;
          const token = body.accessToken?.trim() || config.accessToken;

          if (!phoneId || !token) {
            return sendJson(res, 400, {
              success: false,
              message: 'Phone Number ID and Access Token are required to test connection.',
            });
          }

          const result = await whatsappQueueWorker.testConnection(phoneId, token);
          return sendJson(res, 200, result);
        }

        // 4. POST /api/whatsapp/dispatch (Start bulk dispatch)
        if (req.method === 'POST' && pathname === '/api/whatsapp/dispatch') {
          const payload: CreateDispatchPayload = await parseJsonBody(req);

          if (!payload.subscribers || payload.subscribers.length === 0) {
            return sendJson(res, 400, {
              error: 'No subscribers provided in batch payload',
            });
          }

          const batch = whatsappStore.createDispatch(payload);
          whatsappQueueWorker.triggerImmediate();

          return sendJson(res, 201, {
            success: true,
            dispatchId: batch.id,
            batch,
          });
        }

        // 4b. POST /api/whatsapp/send-single (Individual customized reminder)
        if (req.method === 'POST' && pathname === '/api/whatsapp/send-single') {
          const body = await parseJsonBody(req);
          if (!body.subscriber || !body.subscriber.memberId) {
            return sendJson(res, 400, { error: 'Subscriber details required' });
          }

          const batch = whatsappStore.createDispatch({
            schemeId: body.subscriber.schemeId,
            schemeName: body.subscriber.schemeName,
            companyName: body.companyName || 'Chit Funds',
            messageTemplate: body.messageTemplate,
            templateName: body.templateName,
            forceSend: body.forceSend !== undefined ? body.forceSend : true,
            initiatedBy: body.initiatedBy,
            subscribers: [body.subscriber],
          });

          whatsappQueueWorker.triggerImmediate();
          return sendJson(res, 201, {
            success: true,
            dispatchId: batch.id,
            job: batch.jobs[0],
            batch,
          });
        }

        // 5. GET /api/whatsapp/dispatch/active
        if (req.method === 'GET' && pathname === '/api/whatsapp/dispatch/active') {
          const active = whatsappStore.getActiveDispatch();
          return sendJson(res, 200, { batch: active });
        }

        // 6. GET /api/whatsapp/history (Audit & logs of all dispatches)
        if (req.method === 'GET' && pathname === '/api/whatsapp/history') {
          const history = whatsappStore.getAllDispatches();
          return sendJson(res, 200, { history });
        }

        // 6b. DELETE /api/whatsapp/history (Clear past dispatch logs)
        if (req.method === 'DELETE' && pathname === '/api/whatsapp/history') {
          whatsappStore.clearHistory();
          return sendJson(res, 200, { success: true, message: 'WhatsApp message history cleared.' });
        }

        // 7. GET /api/whatsapp/dispatch/:id
        const dispatchMatch = pathname.match(/^\/api\/whatsapp\/dispatch\/([a-zA-Z0-9_-]+)$/);
        if (req.method === 'GET' && dispatchMatch) {
          const id = dispatchMatch[1];
          const batch = whatsappStore.getDispatch(id);
          if (!batch) {
            return sendJson(res, 404, { error: 'Dispatch batch not found' });
          }
          return sendJson(res, 200, { batch });
        }

        // 8. POST /api/whatsapp/dispatch/:id/job/:jobId/retry
        const jobRetryMatch = pathname.match(/^\/api\/whatsapp\/dispatch\/([a-zA-Z0-9_-]+)\/job\/([a-zA-Z0-9_-]+)\/retry$/);
        if (req.method === 'POST' && jobRetryMatch) {
          const dispatchId = jobRetryMatch[1];
          const jobId = jobRetryMatch[2];
          const job = whatsappStore.retryJob(dispatchId, jobId);
          if (!job) {
            return sendJson(res, 404, { error: 'Job or dispatch batch not found' });
          }
          whatsappQueueWorker.triggerImmediate();
          return sendJson(res, 200, { success: true, job });
        }

        // 9. POST /api/whatsapp/dispatch/:id/retry (Retry all failed/skipped in batch)
        const retryMatch = pathname.match(/^\/api\/whatsapp\/dispatch\/([a-zA-Z0-9_-]+)\/retry$/);
        if (req.method === 'POST' && retryMatch) {
          const id = retryMatch[1];
          const batch = whatsappStore.retryFailedJobs(id);
          if (!batch) {
            return sendJson(res, 404, { error: 'Dispatch batch not found' });
          }
          whatsappQueueWorker.triggerImmediate();
          return sendJson(res, 200, { success: true, batch });
        }


        // 8. GET /api/whatsapp/webhook (Meta verification challenge)
        if (req.method === 'GET' && pathname === '/api/whatsapp/webhook') {
          const query = parsedUrl.query;
          const mode = query['hub.mode'];
          const token = query['hub.verify_token'];
          const challenge = query['hub.challenge'];
          const config = whatsappStore.getConfig();

          if (mode === 'subscribe' && token === config.verifyToken) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(challenge);
            return;
          }
          return sendJson(res, 403, { error: 'Verification failed' });
        }

        // 9. POST /api/whatsapp/webhook (Meta delivery receipts & status callbacks)
        if (req.method === 'POST' && pathname === '/api/whatsapp/webhook') {
          const body = await parseJsonBody(req);
          try {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0]?.value;
            const statuses = change?.statuses;

            if (statuses && Array.isArray(statuses)) {
              for (const statusItem of statuses) {
                const wamid = statusItem.id;
                const status = statusItem.status; // 'delivered' | 'read' | 'failed'
                if (status === 'delivered' || status === 'read') {
                  whatsappStore.updateJobByWamid(wamid, 'delivered');
                } else if (status === 'failed') {
                  const errorMsg = statusItem.errors?.[0]?.message || 'Delivery failed';
                  whatsappStore.updateJobByWamid(wamid, 'failed', errorMsg);
                }
              }
            }
          } catch (e) {
            console.error('Error processing WhatsApp webhook callback', e);
          }
          return sendJson(res, 200, { status: 'received' });
        }

        // Fallthrough
        next();
      });
    },
  };
}
