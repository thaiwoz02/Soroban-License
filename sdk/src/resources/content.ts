import { AxiosInstance } from 'axios';
import { ContentLicense, IssueContentLicenseParams } from '../types';

export class ContentResource {
  constructor(private http: AxiosInstance) {}

  async issue(params: IssueContentLicenseParams): Promise<ContentLicense> {
    const { data } = await this.http.post('/content', params);
    return data;
  }

  async verifyAccess(
    contentId: string,
    holderAddress: string
  ): Promise<{ valid: boolean; license: ContentLicense | null }> {
    const { data } = await this.http.get(`/content/verify/${contentId}`, {
      params: { holderAddress },
    });
    return data;
  }
}
