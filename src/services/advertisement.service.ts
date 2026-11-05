// src/services/advertisement.service.ts
import { apiRequest } from "./api";

// ------------------------------
// 1. ENUMS
// ------------------------------
export enum AdCampaignStatus {
  Draft = 0, // Nháp (mới tạo, chưa gán gói)
  PendingModeration = 1, // Chờ AI/Admin duyệt thủ công (nội dung nhạy cảm)
  PendingPayment = 2, // Đã duyệt (AI duyệt hoặc Admin duyệt), chờ Partner thanh toán
  Active = 3, // Đang chạy (Đã thanh toán & Publish)
  Completed = 4, // Đã hoàn thành / Hết hạn
  Rejected = 5, // Bị từ chối
}

// ------------------------------
// 2. INTERFACES (MODELS)
// ------------------------------
export interface AdPackage {
  id: string;
  code: string;
  name: string;
  type: number;
  role: number;
  price: number;
  durationInDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface PaginatedPackagesResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  packages: AdPackage[];
}

export interface AdCampaign {
  id: string;
  companyUserId: string;
  companyName: string;
  packageId: string;
  packageName: string;
  title: string;
  content: string;
  destinationUrl: string;
  mediaUrl?: string | null;
  status: AdCampaignStatus;
  budgetCap: number;
  rejectionReason?: string | null;
  impressionCount: number;
  clickCount: number;
  startedAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCampaignsResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  campaigns: AdCampaign[];
}

// ------------------------------
// 3. REQUEST/RESPONSE DTOs
// ------------------------------
export interface CreateCampaignRequest {
  title: string;
  content: string;
  destinationUrl: string;
  mediaUrl?: string | null;
}

export interface AssignPackageRequest {
  packageId: string;
}

export interface UpdateCampaignRequest {
  packageId?: string | null;
  title: string;
  content: string;
  destinationUrl: string;
  mediaUrl?: string | null;
}

export interface TransactionResponse {
  transactionId: string;
  campaignId: string;
  amount: number;
  checkoutUrl: string;
  status: string;
}

// ------------------------------
// 4. API SERVICE
// ------------------------------
export const advertisementService = {
  getPackages: (
    params?: { page?: number; pageSize?: number; isActive?: boolean },
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params?.isActive !== undefined)
      query.append("isActive", params.isActive.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<PaginatedPackagesResponse>(`/packages${queryString}`, {
      signal,
    });
  },

  getMyCampaigns: (
    params?: { page?: number; pageSize?: number },
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<PaginatedCampaignsResponse>(
      `/advertisements/campaigns/my${queryString}`,
      {
        signal,
      },
    );
  },

  getCampaignDetail: (id: string, signal?: AbortSignal) => {
    return apiRequest<AdCampaign>(`/advertisements/campaigns/${id}`, {
      signal,
    });
  },

  /**
   * 1. Tạo chiến dịch bản nháp (Status = Draft, PackageId = null)
   * POST /advertisements/campaigns
   */
  createCampaign: (
    formData: FormData,
    signal?: AbortSignal,
  ): Promise<AdCampaign> => {
    return apiRequest<AdCampaign>("/advertisements/campaigns", {
      method: "POST",
      body: formData,
      signal,
    });
  },

  /**
   * 2. Gán gói vào chiến dịch Draft và chạy AI review nội dung
   * PATCH /advertisements/campaigns/{campaignId}/package
   */
  assignPackage: (campaignId: string, data: AssignPackageRequest) => {
    return apiRequest<AdCampaign>(
      `/advertisements/campaigns/${campaignId}/package`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  updateCampaign: (id: string, data: UpdateCampaignRequest) => {
    return apiRequest<AdCampaign>(`/advertisements/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  createPayment: (id: string) => {
    return apiRequest<TransactionResponse>(
      `/advertisements/campaigns/${id}/payments`,
      {
        method: "POST",
      },
    );
  },
};
