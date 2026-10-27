// src/services/advertisement.service.ts
import { apiRequest } from "./api";

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

// Khớp chính xác với cấu trúc item trong mảng campaigns từ API response
export interface AdCampaign {
  id: string;
  companyUserId: string;
  companyName: string;
  packageId: string;
  packageName: string;
  title: string;
  content: string;
  destinationUrl?: string;
  mediaUrl?: string;
  status: number; // Trạng thái trả về dạng số (ví dụ: 3 là Active)
  budgetCap: number;
  impressionCount: number; // Khớp với impressionCount
  clickCount: number; // Khớp với clickCount
  startedAt: string; // Khớp với startedAt
  expiredAt: string; // Khớp với expiredAt
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

export interface CreateAdCampaignDto {
  packageId: string;
  title: string;
  content: string;
  mediaUrl?: string;
  destinationUrl?: string;
  returnUrl: string;
  cancelUrl: string;
}

export const advertisementService = {
  // Lấy danh sách gói quảng cáo
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

  // Lấy danh sách chiến dịch của công ty (trả về kiểu phân trang PaginatedCampaignsResponse)
  getMyCampaigns: (signal?: AbortSignal) =>
    apiRequest<PaginatedCampaignsResponse>("/advertisements/campaigns/my", {
      signal,
    }),

  // Đăng ký gói (Tạo chiến dịch và nhận checkoutUrl từ PayOS)
  createCampaign: (data: CreateAdCampaignDto) =>
    apiRequest<{ checkoutUrl: string }>("/advertisements/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
