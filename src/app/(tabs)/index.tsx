import { AdPostCard, type AdResponse } from "@/components/community/AdPostCard";
import { CommunityComposer } from "@/components/community/CommunityComposer";
import { PostDetailModal } from "@/components/community/CommunityPostDetailModal";
import { UpdatePostModal } from "@/components/community/UpdatePostModal";
import { colors } from "@/constants/colors";
import {
  communityService,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
} from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunityScreen() {
  const { isAuthenticated, account } = useAuthStore();
  const params = useLocalSearchParams<{ postId?: string }>();
  const pathname = usePathname();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(
    params.postId || null,
  );
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [adPost, setAdPost] = useState<AdResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | null>(
    null,
  );
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);

  const fetchAdPost = async () => {
    try {
      const data = await communityService.getAdFeed();
      const fetchedAd = Array.isArray(data)
        ? data[0]
        : ((data as any)?.data ?? data);
      if (fetchedAd) setAdPost(fetchedAd);
    } catch (error) {
      console.error("Lỗi tải Ad Post:", error);
    }
  };

  const feedData = useMemo(() => {
    const combined: Array<{ type: "POST" | "AD"; id: string; data: any }> = [];

    posts.forEach((post, index) => {
      combined.push({ type: "POST", id: `post-${post.id}`, data: post });

      if (index === 2 && adPost) {
        combined.push({ type: "AD", id: `ad-${adPost.id}`, data: adPost });
      }
    });

    return combined;
  }, [posts, adPost]);

  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      if (pageNum === 1) {
        fetchAdPost();
      }

      const data = await communityService.getPosts({
        page: pageNum,
        pageSize: 10,
      });
      const fetchedPosts = Array.isArray(data)
        ? data
        : ((data as any)?.data ?? []);

      if (isRefresh || pageNum === 1) setPosts(fetchedPosts);
      else setPosts((prev) => [...prev, ...fetchedPosts]);

      setHasMore(fetchedPosts.length >= 10);
      setPage(pageNum);
    } catch (error) {
      console.error(error);
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

  const openPostDetail = (post: PostResponse) => {
    // 1. Mở modal bằng state
    setSelectedPostId(post.id);

    // 2. Gắn ?postId vào URL trong im lặng (để nếu user copy link share vẫn có)
    if (Platform.OS === "web") {
      window.history.replaceState(null, "", `${pathname}?postId=${post.id}`);
    } else {
      router.setParams({ postId: post.id });
    }
  };

  const closePostDetail = () => {
    // 1. Đóng modal bằng state
    setSelectedPostId(null);

    // 2. Xóa sạch query param khỏi URL trong im lặng (KHÔNG GÂY RE-RENDER)
    if (Platform.OS === "web") {
      window.history.replaceState(null, "", pathname);
    } else {
      router.setParams({ postId: undefined });
    }
  };
  const handleConfirmDeletePost = async () => {
    if (!deleteConfirmPostId) return;
    try {
      // 1. Chỉ gọi API xóa trên Server nếu KHÔNG PHẢI là ID tạm
      if (!deleteConfirmPostId.startsWith("temp-")) {
        await communityService.deletePost(deleteConfirmPostId);
      }

      // 2. Xóa bài viết khỏi màn hình (UI) ngay lập tức
      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirmPostId));
      if (adPost?.id === deleteConfirmPostId) setAdPost(null);
      setDeleteConfirmPostId(null);
    } catch {
      Alert.alert("Lỗi", "Không thể xóa bài viết.");
    }
  };

  // Hàm xử lý gọi API Bookmark khớp với Response từ Swagger
  const handleToggleBookmark = async (postId: string) => {
    try {
      const response: any = await communityService.toggleBookmark(postId);

      // Lấy giá trị message trả về từ Backend ("Saved" hoặc "Unsaved")
      const messageStatus = response?.message;
      const isNowSaved = messageStatus === "Saved";

      // Cập nhật lại state của bài viết tương ứng trên danh sách feed
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: isNowSaved } : p)),
      );

      // Thông báo phản hồi trực quan
      const notifyText =
        messageStatus === "Saved"
          ? "Đã lưu bài viết vào mục đã lưu."
          : "Đã hủy lưu bài viết.";
      Alert.alert("Thành công", notifyText);
    } catch (error) {
      console.error("Lỗi toggle bookmark:", error);
      Alert.alert(
        "Lỗi",
        "Không thể thực hiện lưu bài viết. Vui lòng thử lại sau.",
      );
    }
  };
  // Hàm xử lý Thích / Bỏ thích bài viết (Optimistic Update)
  const handleToggleReaction = async (postId: string) => {
    try {
      // Gọi API toggle reaction
      await communityService.toggleReact(postId);

      // Cập nhật state local ngay lập tức (tăng/giảm số lượng và đổi trạng thái)
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const isFavorited = !(p as any).isFavorited;
            return {
              ...p,
              isFavorited,
              favoriteCount: isFavorited
                ? p.favoriteCount + 1
                : Math.max(0, p.favoriteCount - 1),
            };
          }
          return p;
        }),
      );
    } catch (error) {
      console.error("Lỗi thả cảm xúc:", error);
      Alert.alert("Lỗi", "Không thể thực hiện thích bài viết.");
    }
  };
  const renderMedia = (urls?: string[]) => {
    if (!urls || urls.length === 0) return null;
    if (urls.length === 1)
      return (
        <Image
          source={{ uri: urls[0] }}
          style={styles.singleImage}
          resizeMode="cover"
        />
      );
    if (urls.length === 2)
      return (
        <View style={styles.imageGrid}>
          <View style={styles.imageRow}>
            <Image
              source={{ uri: urls[0] }}
              style={styles.gridImageHalf}
              resizeMode="cover"
            />
            <Image
              source={{ uri: urls[1] }}
              style={styles.gridImageHalf}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    if (urls.length === 3)
      return (
        <View style={styles.imageGrid}>
          <Image
            source={{ uri: urls[0] }}
            style={styles.gridImageMain}
            resizeMode="cover"
          />
          <View style={styles.imageRow}>
            <Image
              source={{ uri: urls[1] }}
              style={styles.gridImageHalfBottom}
              resizeMode="cover"
            />
            <Image
              source={{ uri: urls[2] }}
              style={styles.gridImageHalfBottom}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    return (
      <View style={styles.imageGrid}>
        <Image
          source={{ uri: urls[0] }}
          style={styles.gridImageMain}
          resizeMode="cover"
        />
        <View style={styles.imageRow}>
          <Image
            source={{ uri: urls[1] }}
            style={styles.gridImageThird}
            resizeMode="cover"
          />
          <Image
            source={{ uri: urls[2] }}
            style={styles.gridImageThird}
            resizeMode="cover"
          />
          <View style={styles.gridImageThirdContainer}>
            <Image
              source={{ uri: urls[3] }}
              style={styles.gridImageThird}
              resizeMode="cover"
            />
            {urls.length > 4 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>+{urls.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPostCard = ({ item }: { item: PostResponse }) => {
    const isPostOwner =
      account?.id === item.authorUserId ||
      (account as any)?.profile?.id === item.authorUserId;

    const isOpenMenu = optionsPostId === item.id;
    const isSaved = (item as any).isSaved;
    const isFavorited = (item as any).isFavorited; // Trạng thái đã thích hay chưa

    return (
      <View
        style={[styles.card, isOpenMenu && { zIndex: 9999, elevation: 10 }]}
      >
        {/* Header bài viết */}
        <View style={[styles.cardHeader, isOpenMenu && { zIndex: 9999 }]}>
          <Pressable
            style={styles.authorInfo}
            onPress={() => openPostDetail(item)}
          >
            <View style={[styles.avatarPlaceholder, { overflow: "hidden" }]}>
              {item.authorAvatar ? (
                <Image
                  source={{ uri: item.authorAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {item.authorName?.charAt(0)?.toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{item.authorName}</Text>
              <Text style={styles.postDate}>
                {new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </Pressable>

          {/* Dấu 3 chấm tùy chọn */}
          <View style={styles.menuAnchor}>
            <Pressable
              onPress={() => setOptionsPostId(isOpenMenu ? null : item.id)}
              style={styles.iconBtnSmall}
            >
              <SymbolView
                name={{
                  ios: "ellipsis",
                  android: "more_horiz",
                  web: "more_horiz",
                }}
                size={20}
                tintColor={colors.textSecondary}
              />
            </Pressable>

            {isOpenMenu && (
              <>
                <Pressable
                  style={styles.dropdownBackdrop}
                  onPress={() => setOptionsPostId(null)}
                />
                <View style={styles.dropdownContainerRight}>
                  <View style={styles.tooltipArrow} />
                  <View style={styles.dropdownMenu}>
                    <Pressable
                      onPress={() => {
                        setOptionsPostId(null);
                        handleToggleBookmark(item.id);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
                      </Text>
                    </Pressable>

                    {isPostOwner && (
                      <>
                        <Pressable
                          onPress={() => {
                            setOptionsPostId(null);
                            setEditingPost(item); // Mở modal chỉnh sửa
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Sửa bài viết
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            setOptionsPostId(null);
                            setDeleteConfirmPostId(item.id);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text
                            style={[styles.optionText, { color: colors.error }]}
                          >
                            Xóa bài viết
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Nội dung mô tả (Bấm vào để xem chi tiết) */}
        <Pressable onPress={() => openPostDetail(item)}>
          <Text style={styles.description} numberOfLines={4}>
            {item.description}
          </Text>
        </Pressable>

        {/* Media (Bấm vào để xem chi tiết) */}
        <Pressable onPress={() => openPostDetail(item)}>
          {renderMedia(item.mediaUrls)}
        </Pressable>

        {/* Footer tương tác */}
        <View style={styles.cardFooter}>
          {/* Nút Thích độc lập */}
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleToggleReaction(item.id)}
          >
            <SymbolView
              name={{
                ios: isFavorited ? "heart.fill" : "heart",
                android: isFavorited ? "favorite" : "favorite_border",
                web: isFavorited ? "favorite" : "favorite_border",
              }}
              size={18}
              tintColor={isFavorited ? "#EF4444" : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                isFavorited && { color: "#EF4444", fontWeight: "600" },
              ]}
            >
              {item.favoriteCount}
            </Text>
          </Pressable>

          {/* Nút Bình luận (Bấm vào mở modal chi tiết) */}
          <Pressable
            style={styles.actionBtn}
            onPress={() => openPostDetail(item)}
          >
            <SymbolView
              name={{
                ios: "bubble.right.fill", // Đổi thành fill cho đồng bộ
                android: "comment",
                web: "comment",
              }}
              size={18}
              tintColor={colors.textSecondary}
            />
            <Text style={styles.actionText}>{item.commentCount}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={feedData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === "AD") {
              return <AdPostCard ad={item.data} />;
            }
            return renderPostCard({ item: item.data });
          }}
          onScroll={() => {
            if (optionsPostId) setOptionsPostId(null);
          }}
          ListHeaderComponent={
            isAuthenticated ? (
              <CommunityComposer
                onCreated={() => fetchFeed(1, true)} // <--- Load lại trang 1 và bật loading refresh
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFeed(1, true)}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) fetchFeed(page + 1);
          }}
        />
      )}

      <PostDetailModal
        postId={selectedPostId} // <--- Đổi thành state cục bộ
        initialPost={posts.find((p) => p.id === selectedPostId) || null} // <--- Đổi thành state cục bộ
        onClose={closePostDetail}
        onPostDeleted={(id) => {
          setPosts((prev) => prev.filter((p) => p.id !== id));
        }}
        // Nhận dữ liệu cập nhật từ Modal và đồng bộ ra Feed ngay lập tức
        onPostUpdated={(updatedPost) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
          );
        }}
      />

      <Modal visible={!!deleteConfirmPostId} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Xóa bài viết?</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 10,
              }}
            >
              <Pressable
                style={[styles.popupBtn, { backgroundColor: "#F3F4F6" }]}
                onPress={() => setDeleteConfirmPostId(null)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                style={[styles.popupBtn, { backgroundColor: colors.error }]}
                onPress={handleConfirmDeletePost}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <UpdatePostModal
        post={editingPost}
        visible={!!editingPost}
        onClose={() => setEditingPost(null)}
        onUpdated={(updated) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    padding: 16,
    gap: 16,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  authorInfo: { flexDirection: "row", gap: 10, alignItems: "center", flex: 1 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "700" },
  authorName: { fontSize: 15, fontWeight: "600" },
  postDate: { fontSize: 12, color: colors.textSecondary },
  description: { fontSize: 14, lineHeight: 20 },

  cardFooter: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#F3F4F6",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, color: colors.textSecondary },

  menuAnchor: { position: "relative" },
  iconBtnSmall: { padding: 4 },
  dropdownBackdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  dropdownContainerRight: {
    position: "absolute",
    top: 32,
    right: 0,
    zIndex: 1000,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFF",
    alignSelf: "flex-end",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dropdownMenu: {
    minWidth: 150,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionText: { fontSize: 15, fontWeight: "500" },

  singleImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  imageGrid: { width: "100%", borderRadius: 12, overflow: "hidden", gap: 2 },
  imageRow: { flexDirection: "row", gap: 2 },
  gridImageHalf: { flex: 1, aspectRatio: 1, backgroundColor: "#F3F4F6" },
  gridImageMain: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#F3F4F6",
  },
  gridImageHalfBottom: {
    flex: 1,
    aspectRatio: 4 / 3,
    backgroundColor: "#F3F4F6",
  },
  gridImageThirdContainer: { flex: 1, aspectRatio: 1 },
  gridImageThird: { flex: 1, aspectRatio: 1, backgroundColor: "#F3F4F6" },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreImagesText: { color: "#FFF", fontSize: 20, fontWeight: "700" },

  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  popupContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  popupTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  popupBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
});
