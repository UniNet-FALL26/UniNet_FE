import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import type {
  AdCampaignFeedItem,
  PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
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

// ==========================================
// MOCK DATA
// ==========================================

const MOCK_POSTS: PostResponse[] = [
  {
    id: "post-1",
    authorUserId: "user-1",
    authorName: "Nguyễn Văn A",
    authorActorType: 0,
    description:
      "Hôm nay mình vừa hoàn thành xong đồ án React Native với Expo! Cảm giác rất tuyệt vời. Có bạn nào đang tìm hiểu về Expo Symbols không?",
    mediaUrls: ["https://picsum.photos/seed/post1/600/400"],
    favoriteCount: 15,
    commentCount: 4,
    isFavorited: true,
    isSaved: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "post-2",
    authorUserId: "user-2",
    authorName: "CLB Lập Trình UniNet",
    authorActorType: 0,
    description:
      "Thông báo: Workshop 'Chinh phục Docker & CI/CD cho Sinh viên' sẽ diễn ra vào cuối tuần này. Đăng ký ngay để nhận tư vấn trực tiếp từ các Senior Engineer nhé!",
    mediaUrls: [],
    favoriteCount: 42,
    commentCount: 12,
    isFavorited: false,
    isSaved: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "post-3",
    authorUserId: "user-3",
    authorName: "Trần Thị B",
    authorActorType: 0,
    description:
      "Cần tìm bạn làm chung đồ án tốt nghiệp mảng Mobile / React Native. Yêu cầu có kiến thức cơ bản về TypeScript và REST API ạ.",
    mediaUrls: ["https://picsum.photos/seed/post3/600/400"],
    favoriteCount: 8,
    commentCount: 2,
    isFavorited: false,
    isSaved: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "post-4",
    authorUserId: "user-4",
    authorName: "Lê Minh C",
    authorActorType: 0,
    description:
      "Góc chia sẻ tài liệu ôn thi môn Kiến trúc máy tính & Hệ điều hành. Mọi người thả tim để mình gửi link Drive nhé!",
    mediaUrls: [],
    favoriteCount: 89,
    commentCount: 35,
    isFavorited: true,
    isSaved: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "post-5",
    authorUserId: "user-5",
    authorName: "Phạm Quốc D",
    authorActorType: 0,
    description: "Chiều thu ở khuôn viên trường, không khí bình yên quá!",
    mediaUrls: ["https://picsum.photos/seed/post5/600/400"],
    favoriteCount: 24,
    commentCount: 6,
    isFavorited: false,
    isSaved: false,
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_ADS: AdCampaignFeedItem[] = [
  {
    id: "ad-1",
    title: "Khóa học Fullstack Web & Mobile 2026",
    content:
      "Giảm 50% học phí cho sinh viên UniNet khi đăng ký ngay hôm nay. Cam kết hỗ trợ việc làm sau tốt nghiệp!",
    destinationUrl: "https://google.com",
    mediaUrl: "https://picsum.photos/seed/ad1/600/300",
  },
  {
    id: "ad-2",
    title: "Tuyển dụng Thực tập sinh IT - FPT Software",
    content:
      "Cơ hội làm việc tại môi trường chuyên nghiệp, nhận trợ cấp lên đến 10 triệu/tháng.",
    destinationUrl: "https://google.com",
    mediaUrl: "https://picsum.photos/seed/ad2/600/300",
  },
];

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

  const mergePostsAndAds = (
    posts: PostResponse[],
    ads: AdCampaignFeedItem[],
    currentPage: number,
  ): FeedItem[] => {
    const result: FeedItem[] = [];
    let adIndex = 0;

    posts.forEach((post, index) => {
      result.push({ id: `post-${post.id}`, type: "post", data: post });

      if ((index + 1) % 4 === 0 && ads.length > 0) {
        const ad = ads[adIndex % ads.length];
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

  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    }
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const mockPosts =
        pageNum === 1
          ? MOCK_POSTS
          : MOCK_POSTS.slice(0, 2).map((post) => ({
              ...post,
              id: `${post.id}-p${pageNum}`,
            }));

      const newFeedItems = mergePostsAndAds(mockPosts, MOCK_ADS, pageNum);

      if (isRefresh || pageNum === 1) {
        setFeedItems(newFeedItems);
      } else {
        setFeedItems((prev) => [...prev, ...newFeedItems]);
      }

      setHasMore(pageNum < 3);
      setPage(pageNum);
    } catch {
      setError("Chưa tải được bảng tin. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed(1);
    }, [fetchFeed]),
  );

  const handleToggleLike = (postId: string) => {
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
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
  };

  const handleToggleBookmark = (postId: string) => {
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.type === "post" && item.data.id === postId) {
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
  };

  const handleSubmitReport = async () => {
    if (!reportPostId || !reportReason.trim()) {
      setReportError("Vui lòng nhập lý do báo cáo.");
      return;
    }

    setSubmittingReport(true);
    setReportError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setReportPostId(null);
      setReportReason("");
    } catch {
      setReportError("Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAdPress = async (ad: AdCampaignFeedItem) => {
    if (ad.destinationUrl) {
      await Linking.openURL(ad.destinationUrl).catch(() => {});
    }
  };

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
          onPress={() =>
            router.push({
              pathname: "/community/posts/[id]" as any,
              params: { id: post.id },
            })
          }
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cộng đồng</Text>
        {isAuthenticated && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tạo bài viết mới"
            onPress={() => router.push("/community/create" as any)}
            style={({ pressed }) => [
              styles.createBtn,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "square.and.pencil", android: "edit", web: "edit" }}
              size={18}
              tintColor={colors.primary}
            />
            <Text style={styles.createBtnLabel}>Tạo bài viết</Text>
          </Pressable>
        )}
      </View>

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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
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
