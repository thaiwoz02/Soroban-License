import axios, { AxiosInstance } from 'axios';
import { SorobanLicenseConfig } from './types';
import { LicensesResource } from './resources/licenses';
import { ApiKeysResource } from './resources/apiKeys';
import { ContentResource } from './resources/content';
import { VerifyResource } from './resources/verify';

const DEFAULT_API_URLS: Record<string, string> = {
  testnet: 'https://api.testnet.soroban-license.io/v1',
  mainnet: 'https://api.soroban-license.io/v1',
};

export class SorobanLicense {
  private http: AxiosInstance;

  public licenses: LicensesResource;
  public apiKeys: ApiKeysResource;
  public content: ContentResource;
  public verify: VerifyResource;

  constructor(config: SorobanLicenseConfig = {}) {
    const baseURL =
      config.apiUrl ?? DEFAULT_API_URLS[config.network ?? 'testnet'];

    this.http = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      timeout: 15_000,
    });

    this.licenses = new LicensesResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.content = new ContentResource(this.http);
    this.verify = new VerifyResource(this.http);
  }

  /** Set or rotate the auth token at runtime (e.g. after wallet sign-in). */
  setToken(token: string): void {
    this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
