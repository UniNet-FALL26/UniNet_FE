// src/services/advertisement.service.ts
import { apiRequest } from "./api";

export interface AdPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
}

export interface AdCampaign {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  destinationUrl?: string;
  status: "Active" | "Pending" | "Completed" | "Cancelled";
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
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
  getPackages: (signal?: AbortSignal) =>
    apiRequest<AdPackage[]>("/api/ads/packages", { signal }),

  // Lấy danh sách chiến dịch của công ty kèm số liệu tracking
  getMyCampaigns: (signal?: AbortSignal) =>
    apiRequest<AdCampaign[]>("/api/ads/my-campaigns", { signal }),

  // Đăng ký gói (Tạo chiến dịch và nhận checkoutUrl từ PayOS)
  createCampaign: (data: CreateAdCampaignDto) =>
    apiRequest<{ checkoutUrl: string }>("/api/ads/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
