export interface SorobanLicenseConfig {
  apiUrl?: string;
  apiKey?: string;
  network?: 'testnet' | 'mainnet';
}

export type LicenseType = 'perpetual' | 'subscription' | 'metered' | 'tiered';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'pending_activation';
export type AccessLevel = 'basic' | 'standard' | 'pro' | 'enterprise';

export interface License {
  id: string;
  onChainId: string;
  productId: string;
  issuerAddress: string;
  holderAddress: string;
  licenseType: LicenseType;
  status: LicenseStatus;
  accessLevel: AccessLevel;
  issuedAt: number;
  expiresAt: number;
  maxActivations: number;
  activationCount: number;
  transferable: boolean;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  licenseId: string;
  ownerAddress: string;
  apiId: string;
  rpmLimit: number;
  rpdLimit: number;
  isActive: boolean;
  issuedAt: number;
  expiresAt: number;
  totalRequests: number;
}

export interface ContentLicense {
  id: string;
  onChainId: string;
  issuerAddress: string;
  holderAddress: string;
  contentId: string;
  accessType: 'lifetime' | 'time_based' | 'single_use';
  status: 'active' | 'expired' | 'consumed' | 'revoked';
  issuedAt: number;
  expiresAt: number;
  transferable: boolean;
  consumed: boolean;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  license?: {
    id: string;
    onChainId: string;
    status: LicenseStatus;
    licenseType: LicenseType;
    accessLevel: AccessLevel;
    holderAddress: string;
    issuerAddress: string;
    issuedAt: number;
    expiresAt: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
}

export interface IssueLicenseParams {
  holderAddress: string;
  productId: string;
  licenseType: LicenseType;
  accessLevel: AccessLevel;
  expiresAt?: number;
  maxActivations?: number;
  transferable?: boolean;
  metadata?: Record<string, string>;
}

export interface IssueApiKeyParams {
  licenseId: string;
  apiId: string;
  rpmLimit?: number;
  rpdLimit?: number;
  expiresAt?: number;
}

export interface IssueContentLicenseParams {
  holderAddress: string;
  contentId: string;
  accessType: 'lifetime' | 'time_based' | 'single_use';
  expiresAt?: number;
  transferable?: boolean;
}
