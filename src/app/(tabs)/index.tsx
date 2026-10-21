import { PostCommentsModal } from "@/components/community/CommunityCommentsModal";
import { CommunityComposer } from "@/components/community/CommunityComposer";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import {
  communityService,
  type AdCampaignFeedItem,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FeedItem =
  | { id: string; type: "post"; data: PostResponse }
  | { id: string; type: "ad"; data: AdCampaignFeedItem };

const REPORT_REASONS = [
  "Spam hoặc quảng cáo rác",
  "Nội dung vi phạm tiêu chuẩn cộng đồng",
  "Quấy rối, đe dọa hoặc ngôn từ thù hận",
  "Thông tin giả mạo hoặc sai sự thật",
  "Nội dung bạo lực hoặc nhạy cảm",
];

export default function CommunityScreen() {
  const { isAuthenticated, account } = useAuthStore();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State menu tùy chọn 3 chấm & báo cáo bài viết
  const [optionsPost, setOptionsPost] = useState<PostResponse | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  const trackedImpressions = useRef<Set<string>>(new Set());
  const abortController = useRef<AbortController | null>(null);
  const cachedAds = useRef<AdCampaignFeedItem[]>([]);

  // Trộn bài đăng và quảng cáo với key độc nhất cho cả Post và Ad
  const mergePostsAndAds = (
    posts: PostResponse[],
    ads: AdCampaignFeedItem[],
    currentPage: number,
  ): FeedItem[] => {
    const result: FeedItem[] = [];
    let adIndex = 0;

    const safePosts = Array.isArray(posts) ? posts : [];
    const safeAds = Array.isArray(ads) ? ads : [];

    safePosts.forEach((post, index) => {
      result.push({ id: `post-${post.id}`, type: "post", data: post });

      if ((index + 1) % 3 === 0 && safeAds.length > 0) {
        const ad = safeAds[adIndex % safeAds.length];
        result.push({
          id: `ad-${ad.id}-p${currentPage}-${index}`,
          type: "ad",
          data: ad,
        });
        adIndex++;
      }
    });

    return result;
  };

  // Tải Bảng tin từ Backend API
  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    if (isRefresh) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    }
    setError("");

    try {
      const [postsResponse, adsData] = await Promise.all([
        communityService.getPosts(
          { page: pageNum, pageSize: 10 },
          controller.signal,
        ),
        pageNum === 1 || cachedAds.current.length === 0
          ? communityService.getAdFeed(controller.signal).catch(() => [])
          : Promise.resolve(cachedAds.current),
      ]);

      if (!controller.signal.aborted) {
        const fetchedPosts: PostResponse[] = Array.isArray(postsResponse)
          ? postsResponse
          : (postsResponse?.data ?? []);

        const fetchedAds: AdCampaignFeedItem[] = Array.isArray(adsData)
          ? adsData
          : [];

        if (pageNum === 1) {
          cachedAds.current = fetchedAds;
        }

        const newFeedItems = mergePostsAndAds(
          fetchedPosts,
          cachedAds.current,
          pageNum,
        );

        if (isRefresh || pageNum === 1) {
          setFeedItems(newFeedItems);
        } else {
          setFeedItems((prev) => [...prev, ...newFeedItems]);
        }

        setHasMore(fetchedPosts.length >= 10);
        setPage(pageNum);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Chưa tải được bảng tin. Vui lòng thử lại.",
        );
      }
    } finally {
      if (controller === abortController.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed(1);
      return () => {
        abortController.current?.abort();
      };
    }, [fetchFeed]),
  );

  // Thêm bài viết mới vừa đăng lên đầu bảng tin
  const handlePostCreated = (newPost: PostResponse) => {
    setFeedItems((prev) => [
      { id: `post-${newPost.id}`, type: "post", data: newPost },
      ...prev,
    ]);
  };

  // Xóa bài viết
  const handleDeletePost = async (postId: string) => {
    setOptionsPost(null);
    setFeedItems((prev) =>
      prev.filter((item) => !(item.type === "post" && item.data.id === postId)),
    );

    try {
      await communityService.deletePost(postId);
    } catch {
      fetchFeed(1);
    }
  };

  // Thả tim API
  const handleToggleLike = async (postId: string) => {
    let previousItemState: PostResponse | null = null;

    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
          previousItemState = { ...item.data };
          const isFavorited = !item.data.isFavorited;
          return {
            ...item,
            data: {
              ...item.data,
              isFavorited,
              favoriteCount: isFavorited
                ? item.data.favoriteCount + 1
                : Math.max(0, item.data.favoriteCount - 1),
            },
          };
        }
        return item;
      }),
    );

    try {
      await communityService.toggleReact(postId);
    } catch {
      if (previousItemState) {
        setFeedItems((prev) =>
          prev.map((item) =>
            item.type === "post" && item.data.id === postId
              ? { ...item, data: previousItemState! }
              : item,
          ),
        );
      }
    }
  };

  // Lưu bài viết API
  const handleToggleBookmark = async (postId: string) => {
    let previousItemState: PostResponse | null = null;

    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
          previousItemState = { ...item.data };
          return {
            ...item,
            data: {
              ...item.data,
              isSaved: !item.data.isSaved,
            },
          };
        }
        return item;
      }),
    );

    try {
      await communityService.toggleBookmark(postId);
    } catch {
      if (previousItemState) {
        setFeedItems((prev) =>
          prev.map((item) =>
            item.type === "post" && item.data.id === postId
              ? { ...item, data: previousItemState! }
              : item,
          ),
        );
      }
    }
  };

  // Báo cáo bài viết API
  const handleSubmitReport = async () => {
    if (!reportPostId || !reportReason.trim()) {
      setReportError("Vui lòng chọn lý do báo cáo.");
      return;
    }

    setSubmittingReport(true);
    setReportError("");

    try {
      await communityService.reportPost(reportPostId, {
        reason: reportReason.trim(),
      });
      setReportPostId(null);
      setReportReason("");
    } catch (cause) {
      setReportError(
        cause instanceof Error
          ? cause.message
          : "Không thể gửi báo cáo. Vui lòng thử lại.",
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  // Click Quảng cáo
  const handleAdPress = async (ad: AdCampaignFeedItem) => {
    try {
      void communityService.trackAdClick(ad.id);
      if (ad.destinationUrl) {
        await Linking.openURL(ad.destinationUrl);
      }
    } catch {
      // Ignored
    }
  };

  // Tracking Impression Quảng cáo
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: FeedItem }> }) => {
      viewableItems.forEach(({ item }) => {
        if (
          item.type === "ad" &&
          !trackedImpressions.current.has(item.data.id)
        ) {
          trackedImpressions.current.add(item.data.id);
          void communityService.trackAdImpression(item.data.id);
        }
      });
    },
  ).current;

  const renderPostCard = (post: PostResponse) => {
    const isMenuOpen = optionsPost?.id === post.id;

    return (
      <View style={[styles.card, isMenuOpen && styles.activeCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.authorInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {post.authorName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.postDate}>
                {new Date(post.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </View>

          {/* Anchor chứa nút 3 chấm và Dropdown */}
          <View style={styles.menuAnchor}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tùy chọn bài đăng"
              onPress={() =>
                setOptionsPost((prev) => (prev?.id === post.id ? null : post))
              }
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: "ellipsis",
                  android: "more_vert",
                  web: "more_vert",
                }}
                size={20}
                tintColor={colors.textSecondary}
              />
            </Pressable>

            {/* Dropdown Menu thả xuống tại chỗ */}
            {isMenuOpen && (
              <View style={styles.dropdownMenu}>
                {account?.id === post.authorUserId && (
                  <Pressable
                    onPress={() => handleDeletePost(post.id)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      size={16}
                      tintColor={colors.error}
                    />
                    <Text style={styles.deleteOptionText}>Xóa bài viết</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    setReportPostId(post.id);
                    setReportReason("");
                    setReportError("");
                    setOptionsPost(null);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "exclamationmark.triangle",
                      android: "report",
                      web: "report",
                    }}
                    size={16}
                    tintColor={colors.textPrimary}
                  />
                  <Text style={styles.optionText}>Báo cáo bài viết</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.description}>{post.description}</Text>

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <Image
            source={{ uri: post.mediaUrls[0] }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.cardFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thả tim"
            onPress={() => handleToggleLike(post.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: post.isFavorited ? "heart.fill" : "heart",
                android: post.isFavorited ? "favorite" : "favorite_border",
                web: post.isFavorited ? "favorite" : "favorite_border",
              }}
              size={18}
              tintColor={post.isFavorited ? colors.error : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                post.isFavorited && { color: colors.error },
              ]}
            >
              {post.favoriteCount}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bình luận"
            onPress={() => setActiveCommentPostId(post.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "bubble.right", android: "comment", web: "comment" }}
              size={18}
              tintColor={colors.textSecondary}
            />
            <Text style={styles.actionText}>{post.commentCount}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lưu bài viết"
            onPress={() => handleToggleBookmark(post.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.pressed,
              { marginLeft: "auto" },
            ]}
          >
            <SymbolView
              name={{
                ios: post.isSaved ? "bookmark.fill" : "bookmark",
                android: post.isSaved ? "bookmark" : "bookmark_border",
                web: post.isSaved ? "bookmark" : "bookmark_border",
              }}
              size={18}
              tintColor={post.isSaved ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderAdCard = (ad: AdCampaignFeedItem) => (
    <Pressable
      onPress={() => handleAdPress(ad)}
      style={({ pressed }) => [
        styles.card,
        styles.adCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.adBadgeContainer}>
        <Text style={styles.adBadgeText}>Được tài trợ</Text>
        <SymbolView
          name={{
            ios: "arrow.up.right",
            android: "open_in_new",
            web: "open_in_new",
          }}
          size={14}
          tintColor={colors.primary}
        />
      </View>

      <Text style={styles.adTitle}>{ad.title}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {ad.content}
      </Text>

      {ad.mediaUrl && (
        <Image
          source={{ uri: ad.mediaUrl }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Overlay trong suốt đóng dropdown khi nhấp ra ngoài */}
      {!!optionsPost && (
        <Pressable
          style={styles.backdropOverlay}
          onPress={() => setOptionsPost(null)}
        />
      )}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            accessibilityLabel="Đang tải bảng tin"
            color={colors.primary}
            size="large"
          />
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Button title="Thử lại" onPress={() => fetchFeed(1)} />
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.type === "post"
              ? renderPostCard(item.data)
              : renderAdCard(item.data)
          }
          ListHeaderComponent={
            isAuthenticated ? (
              <CommunityComposer onCreated={handlePostCreated} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFeed(1, true)}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading && !refreshing) {
              fetchFeed(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Modal Báo cáo bài viết */}
      <Modal
        visible={!!reportPostId}
        transparent
        animationType="fade"
        onRequestClose={() => setReportPostId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Báo cáo bài viết</Text>
            <Text style={styles.modalSubtitle}>
              Chọn lý do bạn muốn báo cáo bài viết này:
            </Text>

            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason) => {
                const isSelected = reportReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => {
                      setReportReason(reason);
                      setReportError("");
                    }}
                    style={({ pressed }) => [
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInnerCircle} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!reportError && (
              <Text style={styles.errorText}>{reportError}</Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setReportPostId(null)}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.pressed,
                ]}
                disabled={submittingReport}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>

              <Button
                title={submittingReport ? "Đang gửi..." : "Gửi báo cáo"}
                onPress={handleSubmitReport}
                disabled={submittingReport || !reportReason}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Bình luận */}
      <PostCommentsModal
        visible={!!activeCommentPostId}
        postId={activeCommentPostId || ""}
        onClose={() => setActiveCommentPostId(null)}
        onCommentCountChange={(delta) => {
          setFeedItems((prev) =>
            prev.map((item) => {
              if (
                item.type === "post" &&
                item.data.id === activeCommentPostId
              ) {
                return {
                  ...item,
                  data: {
                    ...item.data,
                    commentCount: Math.max(0, item.data.commentCount + delta),
                  },
                };
              }
              return item;
            }),
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.65,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    gap: 16,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: colors.surface || "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 1,
  },
  activeCard: {
    zIndex: 100,
    elevation: 10,
  },
  adCard: {
    borderWidth: 1,
    borderColor: colors.primaryLight || "#E0E7FF",
    backgroundColor: "#F8FAFC",
  },
  adBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight || "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  postDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuAnchor: {
    position: "relative",
    zIndex: 101,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  dropdownMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    minWidth: 160,
    backgroundColor: colors.surface || "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  deleteOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.error,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border || "#F3F4F6",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.background || "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reasonsList: {
    gap: 8,
    marginVertical: 4,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  reasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight || "#EEF2FF",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textSecondary || "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  reasonOptionTextSelected: {
    fontWeight: "600",
    color: colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
