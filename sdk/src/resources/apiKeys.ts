import { AxiosInstance } from 'axios';
import { ApiKey, IssueApiKeyParams } from '../types';

export class ApiKeysResource {
  constructor(private http: AxiosInstance) {}

  async list(): Promise<{ data: ApiKey[] }> {
    const { data } = await this.http.get('/api-keys');
    return data;
  }

  /** Issue a new API key. Returns the raw key once — store it securely. */
  async issue(params: IssueApiKeyParams): Promise<ApiKey & { rawKey: string }> {
    const { data } = await this.http.post('/api-keys', params);
    return data;
  }

  /** Revoke an API key by ID. */
  async revoke(id: string): Promise<void> {
    await this.http.delete(`/api-keys/${id}`);
  }

  /** Validate a raw API key. Useful for middleware integration. */
  async validate(apiKey: string): Promise<{
    valid: boolean;
    reason?: string;
    apiId?: string;
    rateLimit?: { requestsPerMinute: number; requestsPerDay: number; requestsPerMonth: number };
  }> {
    const { data } = await this.http.post('/api-keys/validate', { apiKey });
    return data;
  }
}
