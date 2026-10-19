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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FeedItem =
  | { id: string; type: "post"; data: PostResponse }
  | { id: string; type: "ad"; data: AdCampaignFeedItem };

export default function CommunityScreen() {
  const { isAuthenticated } = useAuthStore();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

      if ((index + 1) % 4 === 0 && safeAds.length > 0) {
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

  // Thêm bài viết mới vừa đăng qua CommunityComposer lên đầu bảng tin
  const handlePostCreated = (newPost: PostResponse) => {
    setFeedItems((prev) => [
      { id: `post-${newPost.id}`, type: "post", data: newPost },
      ...prev,
    ]);
  };

  // Thả tim API
  const handleToggleLike = async (postId: string) => {
    // 1. Lưu lại trạng thái cũ để Rollback nếu API lỗi
    let previousItemState: PostResponse | null = null;

    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
          previousItemState = { ...item.data }; // Lưu bản sao trạng thái cũ
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
      // 2. Gọi API toggle like
      await communityService.toggleReact(postId);
    } catch {
      // 3. Nếu API lỗi, hoàn tác về đúng trạng thái ban đầu thay vì refetch cả trang
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
    // 1. Lưu lại bản sao trạng thái cũ để Rollback nếu API lỗi
    let previousItemState: PostResponse | null = null;

    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
          previousItemState = { ...item.data }; // Lưu snapshot
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
      // 2. Gọi API toggle lưu bài viết
      await communityService.toggleBookmark(postId);
    } catch {
      // 3. Nếu API lỗi, hoàn tác về trạng thái ban đầu thay vì gọi lại fetchFeed(1)
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
      setReportError("Vui lòng nhập lý do báo cáo.");
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

  const renderPostCard = (post: PostResponse) => (
    <View style={styles.card}>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Báo cáo bài đăng"
          onPress={() => {
            setReportPostId(post.id);
            setReportReason("");
            setReportError("");
          }}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <SymbolView
            name={{
              ios: "exclamationmark.triangle",
              android: "report",
              web: "report",
            }}
            size={18}
            tintColor={colors.textSecondary}
          />
        </Pressable>
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
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
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
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
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
      {/* Trạng thái tải & lỗi ban đầu */}
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

      {/* Modal báo cáo bài viết */}
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
              Cho chúng tôi biết vấn đề với bài viết này:
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do báo cáo..."
              placeholderTextColor={colors.textSecondary}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={4}
            />

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
                disabled={submittingReport || !reportReason.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
      <PostCommentsModal
        visible={!!activeCommentPostId}
        postId={activeCommentPostId || ""}
        onClose={() => setActiveCommentPostId(null)}
        onCommentCountChange={(delta) => {
          // Cập nhật tăng/giảm commentCount trực tiếp trên bài viết tương ứng
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border || "#E5E7EB",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
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
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
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
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border || "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: "top",
    minHeight: 100,
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
