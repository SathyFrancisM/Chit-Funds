import https from 'https';
import { whatsappStore } from './whatsappStore.ts';
import type { WhatsAppJob } from './types.ts';

class WhatsAppQueueWorker {
  private isProcessing = false;
  private queueInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startWorker();
  }

  private startWorker() {
    if (this.queueInterval) return;
    this.queueInterval = setInterval(() => {
      this.processNextJob();
    }, 400); // Process 1 job every 400ms (safe ~2.5 messages/sec rate limit)
  }

  public triggerImmediate() {
    setImmediate(() => this.processNextJob());
  }

  private async processNextJob() {
    if (this.isProcessing) return;

    const activeDispatch = whatsappStore.getActiveDispatch();
    if (!activeDispatch || activeDispatch.status !== 'processing') {
      return;
    }

    const nextJob = activeDispatch.jobs.find((j) => j.status === 'queued');
    if (!nextJob) {
      whatsappStore.recalculateStats(activeDispatch.id);
      return;
    }

    this.isProcessing = true;
    try {
      await this.executeJob(activeDispatch.id, nextJob);
    } catch (err: any) {
      console.error(`Unexpected error processing job ${nextJob.id}:`, err);
      whatsappStore.updateJob(activeDispatch.id, nextJob.id, {
        status: 'failed',
        error: err.message || 'Internal queue processing error',
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(dispatchId: string, job: WhatsAppJob) {
    whatsappStore.updateJob(dispatchId, job.id, {
      status: 'sending',
      attempts: (job.attempts || 0) + 1,
    });

    const config = whatsappStore.getConfig();

    // Verification requirement: Do NOT simulate success if credentials are not configured!
    if (!config.isConfigured || !config.phoneNumberId || !config.accessToken) {
      whatsappStore.updateJob(dispatchId, job.id, {
        status: 'failed',
        error:
          'WhatsApp Cloud API credentials not configured. Please set Phone Number ID and Access Token in Settings.',
      });
      return;
    }

    // Phone validation (must be at least 10 digits)
    if (!job.phoneFormatted || job.phoneFormatted.length < 10) {
      whatsappStore.updateJob(dispatchId, job.id, {
        status: 'failed',
        error: `Invalid phone number format: "${job.phone}" (Requires valid 10-12 digit phone number with country code)`,
      });
      return;
    }

    // Payload for Meta WhatsApp Cloud API
    const payload = config.templateName
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: job.phoneFormatted,
          type: 'template',
          template: {
            name: config.templateName,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: job.memberName || '' },
                  { type: 'text', text: (job.amountDue ?? 0).toString() },
                  { type: 'text', text: (job.seatNumber ?? 1).toString() },
                  { type: 'text', text: job.schemeName || '' },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: job.phoneFormatted,
          type: 'text',
          text: {
            preview_url: false,
            body: job.messageText,
          },
        };

    try {
      const response = await this.callMetaApi(config.phoneNumberId, config.accessToken, payload);

      if (response.messages && response.messages.length > 0) {
        const wamid = response.messages[0].id;
        whatsappStore.updateJob(dispatchId, job.id, {
          status: 'accepted',
          whatsappMessageId: wamid,
          error: undefined,
        });
      } else if (response.error) {
        const errMsg = response.error.message || response.error.error_data?.details || 'Meta API Error';
        whatsappStore.updateJob(dispatchId, job.id, {
          status: 'failed',
          error: `[Meta Code ${response.error.code || 'ERR'}]: ${errMsg}`,
        });
      } else {
        whatsappStore.updateJob(dispatchId, job.id, {
          status: 'failed',
          error: 'Unrecognized response format from WhatsApp Cloud API',
        });
      }
    } catch (err: any) {
      whatsappStore.updateJob(dispatchId, job.id, {
        status: 'failed',
        error: err.message || 'Network error reaching Meta WhatsApp Cloud API',
      });
    }
  }

  public async callMetaApi(phoneNumberId: string, accessToken: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v21.0/${phoneNumberId}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch {
            resolve({ error: { message: `Invalid JSON response: ${responseData.slice(0, 100)}` } });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(15000, () => {
        req.destroy(new Error('Meta API request timed out (15s)'));
      });

      req.write(body);
      req.end();
    });
  }

  public async testConnection(phoneNumberId: string, accessToken: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v21.0/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.display_phone_number || parsed.verified_name || parsed.id) {
              resolve({
                success: true,
                message: `Connected successfully! Display Name: "${parsed.verified_name || 'Business Phone'}", Number: ${parsed.display_phone_number || phoneNumberId}`,
              });
            } else if (parsed.error) {
              resolve({
                success: false,
                message: `[Meta Code ${parsed.error.code}]: ${parsed.error.message}`,
              });
            } else {
              resolve({
                success: false,
                message: 'Unexpected response from Meta API',
              });
            }
          } catch {
            resolve({ success: false, message: 'Invalid response from Meta API' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, message: `Network error: ${err.message}` });
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error('Connection test timed out'));
      });

      req.end();
    });
  }
}

export const whatsappQueueWorker = new WhatsAppQueueWorker();
