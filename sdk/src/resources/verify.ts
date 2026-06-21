import { AxiosInstance } from 'axios';
import { VerifyResult } from '../types';

export class VerifyResource {
  constructor(private http: AxiosInstance) {}

  /** Verify a single license by ID or on-chain hash. No auth required. */
  async verify(licenseId: string): Promise<VerifyResult> {
    const { data } = await this.http.get(`/verify/${licenseId}`);
    return data;
  }

  /** Verify up to 50 licenses in one request. */
  async batch(
    licenseIds: string[]
  ): Promise<{ results: Record<string, { valid: boolean; reason?: string }> }> {
    const { data } = await this.http.post('/verify/batch', { licenseIds });
    return data;
  }
}
