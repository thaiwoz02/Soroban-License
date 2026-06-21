import { AxiosInstance } from 'axios';
import {
  License,
  IssueLicenseParams,
  PaginatedResponse,
} from '../types';

export class LicensesResource {
  constructor(private http: AxiosInstance) {}

  /** List licenses for the authenticated user. */
  async list(params?: {
    role?: 'issuer' | 'holder';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<License>> {
    const { data } = await this.http.get('/licenses', { params });
    return data;
  }

  /** Get a single license by ID. */
  async get(id: string): Promise<License> {
    const { data } = await this.http.get(`/licenses/${id}`);
    return data;
  }

  /** Issue a new license. Caller must be the product owner. */
  async issue(params: IssueLicenseParams): Promise<License> {
    const { data } = await this.http.post('/licenses', params);
    return data;
  }

  /** Revoke a license. Caller must be the issuer. */
  async revoke(id: string): Promise<License> {
    const { data } = await this.http.post(`/licenses/${id}/revoke`);
    return data;
  }

  /** Renew a subscription license with a new expiry timestamp. */
  async renew(id: string, newExpiresAt: number): Promise<License> {
    const { data } = await this.http.post(`/licenses/${id}/renew`, {
      newExpiresAt,
    });
    return data;
  }

  /** Transfer a license to a new holder. */
  async transfer(id: string, newHolderAddress: string): Promise<License> {
    const { data } = await this.http.post(`/licenses/${id}/transfer`, {
      newHolderAddress,
    });
    return data;
  }
}
