import { CommentModal } from "@/components/community/CommentModal";
import { CommunityComposer } from "@/components/community/CommunityComposer";
import { CommunityPostCard, CommunityPostDescription as ExpandableDescription } from "@/components/community/CommunityPostCard";
import { CommunityMediaLightbox } from "@/components/community/CommunityMediaLightbox";
import { shareCommunityPost } from "@/utils/share-community-post";
import { UpdatePostModal } from "@/components/community/UpdatePostModal";
import { colors } from "@/constants/colors";
import { reportApiFailure } from "@/services/api";
import {
  communityService,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Danh sách các lý do báo cáo
const REPORT_REASONS = [
  "Nội dung spam, không mong muốn",
  "Ngôn từ gây thù ghét, đả kích",
  "Thông tin sai sự thật",
  "Quấy rối hoặc bắt nạt",
  "Vi phạm bản quyền, pháp luật",
  "Khác",
];
// Cpn xử lý Description xem thêm
const AD_FREQUENCY = 5;
export default function CommunityScreen() {
  const phone = useWindowDimensions().width < 600;
  const { isAuthenticated, account } = useAuthStore();
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostResponse[]>([]);
  const { postId: requestedPostId } = useLocalSearchParams<{ postId?: string }>();
  useEffect(() => {
    if (!requestedPostId) return;
    const controller = new AbortController();
    communityService.getPostById(requestedPostId, controller.signal).then(post => {
      if (controller.signal.aborted) return;
      setPosts(current => current.some(item => item.id === post.id) ? current : [post, ...current]);
      setDetailPostId(post.id);
    }).catch(error => { if (!controller.signal.aborted) reportApiFailure(error, 'Không mở được bài viết.'); });
    return () => controller.abort();
  }, [requestedPostId, account?.id]);

  const [adPool, setAdPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | null>(
    null,
  );
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [lightboxPost, setLightboxPost] = useState<PostResponse | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  // Cập nhật detailPost để tìm trong adPool
  const detailPost = useMemo(() => {
    if (!detailPostId) return null;
    return (
      posts.find((p) => p.id === detailPostId) ||
      adPool.find((ad) => ad.id === detailPostId) ||
      null
    );
  }, [detailPostId, posts, adPool]);
  // Cập nhật hàm fetch Ads: Lấy cả mảng Ads và đảo lộn (shuffle) để random
  const fetchAdPool = async () => {
    try {
      const data = await communityService.getAdFeed();
      // Đảm bảo data luôn là mảng
      let fetchedAds = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      if (!Array.isArray(fetchedAds) && data) {
        fetchedAds = [data]; // Fallback nếu API trả về 1 object
      }

      // Thuật toán Fisher-Yates Shuffle để random thứ tự Ads
      const shuffledAds = [...fetchedAds].sort(() => 0.5 - Math.random());
      setAdPool(shuffledAds);
    } catch (error) {
      console.error("Lỗi tải Ad Pool:", error);
    }
  };

  const feedData = useMemo(() => {
    const combined: Array<{ type: "POST" | "AD"; id: string; data: any }> = [];
    let adIndexUsed = 0; // Đếm số quảng cáo đã được lấy ra từ kho

    posts.forEach((post, index) => {
      // 1. Luôn chèn bài viết Organic trước
      combined.push({ type: "POST", id: `post-${post.id}`, data: post });

      // 2. Kiểm tra xem đã đủ số lượng bài để chèn Ad chưa
      // (Ví dụ: sau bài index 4, 9, 14... -> tức là bài thứ 5, 10, 15)
      const postNumber = index + 1;
      if (postNumber % AD_FREQUENCY === 0 && adPool.length > 0) {
        // Lấy quảng cáo tiếp theo trong kho.
        // Dùng % adPool.length để lặp lại quảng cáo nếu scroll quá dài và hết kho.
        // Nếu API trả về nhiều ads, người dùng sẽ hiếm khi thấy trùng lại.
        const ad = adPool[adIndexUsed % adPool.length];

        combined.push({
          type: "AD",
          // Cần kèm thêm postNumber vào ID để React Key không bị trùng nếu Ad bị lặp lại vòng 2
          id: `ad-${ad.id}-pos-${postNumber}`,
          data: ad,
        });

        adIndexUsed++; // Tăng biến đếm quảng cáo đã dùng
      }
    });
    return combined;
  }, [posts, adPool]);

  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      // Lấy mới kho quảng cáo nếu là trang 1 hoặc refresh
      if (pageNum === 1 || isRefresh) fetchAdPool();

      const data = await communityService.getPosts({
        page: pageNum,
        pageSize: 10,
      });
      const fetchedPosts = Array.isArray(data)
        ? data
        : ((data as any)?.data ?? []);

      if (isRefresh || pageNum === 1) setPosts(current => {
        const linkedPost = current.find(post => post.id === requestedPostId);
        return linkedPost && !fetchedPosts.some((post: PostResponse) => post.id === linkedPost.id) ? [linkedPost, ...fetchedPosts] : fetchedPosts;
      });
      else setPosts((prev) => [...prev, ...fetchedPosts]);

      setHasMore(fetchedPosts.length >= 10);
      setPage(pageNum);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestedPostId]);

  useFocusEffect(
    useCallback(() => {
      fetchFeed(1);
    }, [fetchFeed]),
  );

  const handleConfirmDeletePost = async () => {
    if (!deleteConfirmPostId) return;
    try {
      if (!deleteConfirmPostId.startsWith("temp-")) {
        await communityService.deletePost(deleteConfirmPostId);
      }
      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirmPostId));
      // Cập nhật cả adPool nếu Ad bị xóa (dù thực tế hiếm khi User xóa được Ad)
      setAdPool((prev) => prev.filter((ad) => ad.id !== deleteConfirmPostId));
      setDeleteConfirmPostId(null);
    } catch (error) {
      reportApiFailure(error, "Không thể xóa bài viết.");
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    try {
      const response: any = await communityService.toggleBookmark(postId);
      const isNowSaved = response?.message === "Saved";
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: isNowSaved } : p)),
      );
    } catch (error) {
      reportApiFailure(error, "Không thể thực hiện lưu bài viết.");
    }
  };
  const handleConfirmReport = async () => {
    // Đảm bảo phải có post ID và đã chọn lý do
    if (!reportPostId || !selectedReason) return;

    try {
      await communityService.reportPost(reportPostId, {
        reason: selectedReason,
      } as any);

      // Đóng modal & reset
      setReportPostId(null);
      setSelectedReason("");
    } catch (error) {
      reportApiFailure(error, "Không thể gửi báo cáo bài viết.");
    }
  };
  const handleToggleReaction = async (postId: string) => {
    try {
      await communityService.toggleReact(postId);
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
      reportApiFailure(error, "Không thể thực hiện thích bài viết.");
    }
  };

  const openLightbox = (post: PostResponse, index: number) => {
    setLightboxPost(post);
    setSelectedImageIndex(index);
  };

  const renderAdCard = (ad: any) => {
    const displayName = ad.companyName || "Đối tác tài trợ";
    const avatarFallback = displayName.charAt(0).toUpperCase();
    const displayUrl = ad.destinationUrl
      ? ad.destinationUrl.replace(/^https?:\/\/(www\.)?/, "")
      : "https://uninet.com";

    // Hàm xử lý khi click vào bất kỳ đâu trên quảng cáo
    const handleAdClick = async () => {
      if (ad.destinationUrl) {
        // TODO: Gọi API đếm lượt click (clickCount) ở đây
        console.log("Đã click Ad ID:", ad.id);

        try {
          // Mở URL (Sẽ mở tab mới trên Web hoặc mở trình duyệt mặc định trên Mobile)
          await Linking.openURL(ad.destinationUrl);
        } catch (error) {
          console.error("Không thể mở URL:", error);
        }
      }
    };

    return (
      // Thay đổi thẻ ngoài cùng thành Pressable và gắn sự kiện onPress
      <View testID={`community-ad-${ad.id}`} style={styles.card}>
        <View style={[styles.cardHeader, styles.adHeader]}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatarPlaceholder, { overflow: "hidden" }]}>
              {ad.companyLogo ? (
                <Image
                  source={{ uri: ad.companyLogo }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{avatarFallback}</Text>
              )}
            </View>
            <View style={styles.adAuthorCopy}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={[styles.authorName, styles.adAuthorName]}>{displayName}</Text>
                <SymbolView
                  name={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  size={14}
                  tintColor="#3B82F6"
                />
              </View>
              <Text style={styles.postDate}>Được tài trợ</Text>
            </View>
          </View>
          <View style={styles.adBadge}>
            <SymbolView name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }} size={14} tintColor={colors.primary} accessible={false} />
            <Text style={styles.adBadgeText}>Quảng cáo</Text>
          </View>
        </View>

        {ad.title && (
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#111827",
              marginBottom: 2,
            }}
          >
            {ad.title}
          </Text>
        )}

        {/* 
          Lưu ý: Nếu người dùng click vào chữ "Xem thêm" trong ExpandableDescription, 
          React Native mặc định sẽ ưu tiên component con (nút Xem thêm) thay vì thẻ Pressable cha, 
          nên nó sẽ mở rộng text chứ không mở link (điều này hoàn toàn hợp lý về mặt UX).
        */}
        {ad.content && <ExpandableDescription text={ad.content} />}

        <View style={styles.mediaContainer}>
          {ad.mediaUrl && (
            <Pressable accessibilityRole="link" accessibilityLabel={ad.title || displayName} onPress={handleAdClick} style={styles.adMediaBox}>
              <Image
                source={{ uri: ad.mediaUrl }}
                style={styles.imageBackdrop}
                resizeMode="cover"
                blurRadius={24}
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Image
                source={{ uri: ad.mediaUrl }}
                style={styles.singleImage}
                resizeMode="contain"
              />
            </Pressable>
          )}
        </View>

          <Pressable accessibilityRole="link" accessibilityLabel="Xem ngay" onPress={handleAdClick} style={styles.adCtaRow}>
            <SymbolView name={{ ios: "link", android: "link", web: "link" }} size={20} tintColor={colors.textSecondary} />
            <Text style={styles.adDestinationText} numberOfLines={1}>
              {displayUrl}
            </Text>

            {/* Đổi từ Pressable thành View vì toàn bộ Card đã click được rồi */}
            <View style={styles.adCtaButton}>
              <Text style={styles.adCtaButtonText}>Xem ngay</Text>
            </View>
          </Pressable>
      </View>
    );
  };
  const renderPostCard = ({ item }: { item: PostResponse }) => {
    const owner = account?.id === item.authorUserId || account?.profile?.id === item.authorUserId;
    return <CommunityPostCard
      post={item}
      menuOpen={optionsPostId === item.id}
      onMenuChange={open => setOptionsPostId(open ? item.id : null)}
      onOpen={() => setDetailPostId(item.id)}
      onOpenMedia={index => openLightbox(item, index)}
      onLike={() => void handleToggleReaction(item.id)}
      onShare={() => void shareCommunityPost(item.id, item.description || 'UniNet')}
      onSave={() => void handleToggleBookmark(item.id)}
      onEdit={owner ? () => setEditingPost(item) : undefined}
      onDelete={owner ? () => setDeleteConfirmPostId(item.id) : undefined}
      onReport={!owner ? () => setReportPostId(item.id) : undefined}
    />;
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
            if (item.type === "AD") return renderAdCard(item.data);
            return renderPostCard({ item: item.data });
          }}
          onScroll={() => {
            if (optionsPostId) setOptionsPostId(null);
          }}
          ListHeaderComponent={
            isAuthenticated ? (
              <CommunityComposer onCreated={() => fetchFeed(1, true)} />
            ) : null
          }
          contentContainerStyle={[styles.listContent, phone && styles.phoneListContent]}
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

      <CommentModal
        post={detailPost as any}
        onClose={() => setDetailPostId(null)}
        onToggleReaction={handleToggleReaction}
        onToggleBookmark={handleToggleBookmark}
        onRequestEdit={(post) => {
          setDetailPostId(null);
          setEditingPost(post);
        }}
        onRequestDelete={(postId) => {
          setDetailPostId(null);
          setDeleteConfirmPostId(postId);
        }}
        onCommentCountChange={(postId, delta) => {
          // Đồng bộ đếm số bình luận ra ngoài feed
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
                : p,
            ),
          );
        }}
      />

      <Modal visible={!!deleteConfirmPostId} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Xóa bài viết?</Text>
            <View style={styles.popupActions}>
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
        onUpdated={(updated) =>
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          )
        }
      />

      {/* OVERLAY XEM ẢNH */}
      <CommunityMediaLightbox urls={lightboxPost?.mediaUrls ?? []} index={selectedImageIndex} onIndexChange={setSelectedImageIndex} onClose={() => setSelectedImageIndex(null)} />
      {/* OVERLAY BÁO CÁO BÀI VIẾT */}
      {/* OVERLAY BÁO CÁO BÀI VIẾT */}
      <Modal visible={!!reportPostId} transparent animationType="fade">
        {/* Bỏ KeyboardAvoidingView đi vì không còn nhập phím nữa */}
        <View style={[styles.popupOverlay, { alignItems: "center" }]}>
          <View style={[styles.popupContent, { width: "85%", maxWidth: 400 }]}>
            <Text style={styles.popupTitle}>Báo cáo bài viết</Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 12,
              }}
            >
              Vui lòng chọn một lý do:
            </Text>

            {/* Vòng lặp render các Radio Buttons */}
            <View style={styles.radioGroup}>
              {REPORT_REASONS.map((reason, index) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={index}
                    style={styles.radioRow}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && { borderColor: colors.primary },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                    <Text style={styles.radioText}>{reason}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.popupActions}>
              <Pressable
                style={[styles.popupBtn, { backgroundColor: "#F3F4F6" }]}
                onPress={() => {
                  setReportPostId(null);
                  setSelectedReason(""); // Reset nếu ấn Hủy
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
                  Hủy
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.popupBtn,
                  // Nếu chưa chọn lý do thì nút mờ đi (màu xám), chọn rồi thì xanh dương
                  {
                    backgroundColor: selectedReason
                      ? colors.primary
                      : "#D1D5DB",
                  },
                ]}
                onPress={handleConfirmReport}
                disabled={!selectedReason} // Vô hiệu hóa nút nếu chưa chọn
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Gửi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  phoneListContent: { paddingHorizontal: 0 },
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    padding: 12, // Giảm từ 16
    gap: 12, // Giảm từ 16
    maxWidth: 650, // Thu nhỏ maxWidth lại
    alignSelf: "center",
    width: "100%",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    paddingBottom: 8,
    gap: 10, // Thu nhỏ gap gốc của bài viết
    elevation: 2,
    boxShadow: "0px 3px 12px rgba(23, 43, 77, 0.08)",
    borderWidth: 1,
    borderColor: "#DFE7F2",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  authorInfo: { flexDirection: "row", gap: 10, alignItems: "center", flex: 1 },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  postDate: { fontSize: 12, color: colors.textSecondary },

  mediaContainer: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  imageBackdrop: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
    transform: [{ scale: 1.15 }],
  },
  singleImage: { width: "100%", height: 280, resizeMode: "contain" }, // Fix 280px + contain

  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  popupContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  popupTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  popupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  popupBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },

  // Ad Specific Styles
  adHeader: { alignItems: 'flex-start', gap: 10 },
  adAuthorCopy: { flex: 1, minWidth: 0 },
  adAuthorName: { flexShrink: 1 },
  adBadge: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: '#EAF3FF' },
  adBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  adMediaBox: { width: "100%" },
  adCtaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    gap: 10,
    backgroundColor: "#F0F2F6",
    borderRadius: 10,
  },
  adDestinationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    marginRight: 10,
  },
  adCtaButton: {
    backgroundColor: "#DCE0E7",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
  },
  adCtaButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
  textInputArea: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    color: "#111827",
  },
  radioGroup: {
    gap: 12,
    marginVertical: 10,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontSize: 15,
    color: "#374151",
    flex: 1, // Để chữ dài tự động xuống dòng chứ không đẩy layout
  },
});
