import { apiRequest } from "@/services/api";

// ==========================================
// ENUMS & TYPES
// ==========================================

export type CommunityActorType = 0 | 1; // 0: Student, 1: Company
export type CommunityContentStatus = 0 | 1 | 2 | 3; // 0: PendingReview, 1: Published, 2: Hidden, 3: Blocked
export type ReportStatus = 0 | 1 | 2; // 0: Open, 1: Resolved, 2: Dismissed

export interface PostResponse {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorActorType: CommunityActorType;
  description: string;
  mediaUrls: string[];
  favoriteCount: number;
  commentCount: number;
  isFavorited: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  data: T[];
}

export interface CreatePostInput {
  description: string;
  mediaUrls?: string[];
}

export interface UpdatePostInput {
  description: string;
  mediaUrls?: string[];
}

export interface CommentResponse {
  id: string;
  postId: string;
  authorUserId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  replyToUserId?: string | null;
  replyToUserName?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: CommentResponse[];
}

export interface CreateCommentInput {
  content: string;
}

export interface CreateReplyInput {
  content: string;
  replyToUserId: string;
}

export interface ReportPostInput {
  reason: string;
}

export interface AdCampaignFeedItem {
  id: string;
  title: string;
  content: string;
  destinationUrl: string;
  mediaUrl?: string | null;
}

// ==========================================
// COMMUNITY SERVICE IMPLEMENTATION
// ==========================================

export const communityService = {
  /**
   * Lấy danh sách bài đăng Community Feed (có phân trang)
   */
  getPosts: (
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<PostResponse>> => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("pageSize", String(params.pageSize ?? 10));
    return apiRequest<PaginatedResponse<PostResponse>>(
      `/community/posts?${query.toString()}`,
      { signal },
    );
  },

  /**
   * Lấy bài đăng theo ID
   */
  getPostById: (id: string, signal?: AbortSignal): Promise<PostResponse> => {
    return apiRequest<PostResponse>(
      `/community/posts/${encodeURIComponent(id)}`,
      { signal },
    );
  },

  /**
   * Tạo bài đăng mới
   */
  createPost: (
    formData: FormData,
    signal?: AbortSignal,
  ): Promise<PostResponse> => {
    // Không dùng JSON.stringify nữa mà truyền trực tiếp FormData vào body.
    // Tùy thuộc vào hàm apiRequest của dự án, thường nếu truyền FormData thì
    // ta nên để headers là undefined hoặc bỏ trống "Content-Type" để trình duyệt/runtime
    // tự động sinh boundary chính xác cho multipart.
    return apiRequest<PostResponse>("/community/posts", {
      method: "POST",
      body: formData,
      signal,
    });
  },

  /**
   * Chỉnh sửa bài đăng
   */
  updatePost: (
    id: string,
    input: UpdatePostInput,
    signal?: AbortSignal,
  ): Promise<PostResponse> => {
    return apiRequest<PostResponse>(
      `/community/posts/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          description: input.description,
          mediaUrls: input.mediaUrls ?? [],
        }),
        signal,
      },
    );
  },

  /**
   * Xóa bài đăng (Soft delete)
   */
  deletePost: (id: string, signal?: AbortSignal): Promise<void> => {
    return apiRequest<void>(`/community/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal,
    });
  },

  /**
   * Toggle Like/Unlike (Thả tim)
   */
  toggleReact: (id: string, signal?: AbortSignal): Promise<void> => {
    return apiRequest<void>(
      `/community/posts/${encodeURIComponent(id)}/react`,
      {
        method: "POST",
        signal,
      },
    );
  },

  /**
   * Toggle Save/Unsave (Lưu bài viết)
   */
  toggleBookmark: (id: string, signal?: AbortSignal): Promise<void> => {
    return apiRequest<void>(
      `/community/posts/${encodeURIComponent(id)}/bookmark`,
      {
        method: "POST",
        signal,
      },
    );
  },

  /**
   * Báo cáo vi phạm bài đăng
   */
  reportPost: (
    id: string,
    input: ReportPostInput,
    signal?: AbortSignal,
  ): Promise<void> => {
    return apiRequest<void>(
      `/community/posts/${encodeURIComponent(id)}/report`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    );
  },

  // ==========================================
  // COMMENTS & REPLIES
  // ==========================================

  /**
   * Lấy danh sách bình luận gốc & reply lồng nhau
   */
  getComments: (
    postId: string,
    signal?: AbortSignal,
  ): Promise<CommentResponse[]> => {
    return apiRequest<CommentResponse[]>(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      { signal },
    );
  },

  /**
   * Tạo bình luận gốc
   */
  createComment: (
    postId: string,
    input: CreateCommentInput,
    signal?: AbortSignal,
  ): Promise<CommentResponse> => {
    return apiRequest<CommentResponse>(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    );
  },

  /**
   * Phản hồi bình luận
   */
  createReply: (
    commentId: string,
    input: CreateReplyInput,
    signal?: AbortSignal,
  ): Promise<CommentResponse> => {
    return apiRequest<CommentResponse>(
      `/community/comments/${encodeURIComponent(commentId)}/replies`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    );
  },

  /**
   * Sửa bình luận
   */
  updateComment: (
    commentId: string,
    input: CreateCommentInput,
    signal?: AbortSignal,
  ): Promise<CommentResponse> => {
    return apiRequest<CommentResponse>(
      `/community/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
        signal,
      },
    );
  },

  /**
   * Xóa bình luận
   */
  deleteComment: (commentId: string, signal?: AbortSignal): Promise<void> => {
    return apiRequest<void>(
      `/community/comments/${encodeURIComponent(commentId)}`,
      {
        method: "DELETE",
        signal,
      },
    );
  },

  // ==========================================
  // ADVERTISEMENT INTEGRATION
  // ==========================================

  /**
   * Lấy danh sách quảng cáo Active ngẫu nhiên để xen kẽ vào Community Feed
   */
  getAdFeed: (signal?: AbortSignal): Promise<AdCampaignFeedItem[]> => {
    return apiRequest<AdCampaignFeedItem[]>("/advertisements/feed", { signal });
  },

  /**
   * Ghi nhận lượt hiển thị (Impression) của quảng cáo
   */
  trackAdImpression: (
    campaignId: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    return apiRequest<void>(
      `/advertisements/campaigns/${encodeURIComponent(campaignId)}/impression`,
      {
        method: "POST",
        signal,
      },
    );
  },

  /**
   * Ghi nhận lượt click chuyển hướng (Click-through) của quảng cáo
   */
  trackAdClick: (campaignId: string, signal?: AbortSignal): Promise<void> => {
    return apiRequest<void>(
      `/advertisements/campaigns/${encodeURIComponent(campaignId)}/click`,
      {
        method: "POST",
        signal,
      },
    );
  },
};
