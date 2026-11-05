import { CommentModal } from "@/components/community/CommentModal";
import { CommunityComposer } from "@/components/community/CommunityComposer";
import { UpdatePostModal } from "@/components/community/UpdatePostModal";
import { colors } from "@/constants/colors";
import { reportApiFailure } from "@/services/api";
import {
  communityService,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
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
const ExpandableDescription = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > 150;
  return (
    <View>
      <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>
        {text}
      </Text>
      {isLong && !expanded && (
        <Pressable onPress={() => setExpanded(true)}>
          <Text style={styles.seeMoreText}>Xem thêm</Text>
        </Pressable>
      )}
    </View>
  );
};
// CẤU HÌNH TẦN SUẤT QUẢNG CÁO: Cứ 5 bài viết sẽ có 1 quảng cáo
const AD_FREQUENCY = 5;
export default function CommunityScreen() {
  const { isAuthenticated, account } = useAuthStore();
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostResponse[]>([]);
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

  const renderMedia = (post: PostResponse) => {
    const urls = post.mediaUrls;
    if (!urls || urls.length === 0) return null;

    if (urls.length === 1)
      return (
        <Pressable onPress={() => openLightbox(post, 0)}>
          <Image
            source={{ uri: urls[0] }}
            style={styles.singleImage}
            resizeMode="contain"
          />
        </Pressable>
      );
    if (urls.length === 2)
      return (
        <View style={styles.imageGrid}>
          <View style={styles.imageRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => openLightbox(post, 0)}
            >
              <Image
                source={{ uri: urls[0] }}
                style={styles.gridImageHalf}
                resizeMode="cover"
              />
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => openLightbox(post, 1)}
            >
              <Image
                source={{ uri: urls[1] }}
                style={styles.gridImageHalf}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        </View>
      );
    if (urls.length === 3)
      return (
        <View style={styles.imageGrid}>
          <Pressable onPress={() => openLightbox(post, 0)}>
            <Image
              source={{ uri: urls[0] }}
              style={styles.gridImageMain}
              resizeMode="cover"
            />
          </Pressable>
          <View style={styles.imageRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => openLightbox(post, 1)}
            >
              <Image
                source={{ uri: urls[1] }}
                style={styles.gridImageHalfBottom}
                resizeMode="cover"
              />
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => openLightbox(post, 2)}
            >
              <Image
                source={{ uri: urls[2] }}
                style={styles.gridImageHalfBottom}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        </View>
      );
    return (
      <View style={styles.imageGrid}>
        <Pressable onPress={() => openLightbox(post, 0)}>
          <Image
            source={{ uri: urls[0] }}
            style={styles.gridImageMain}
            resizeMode="cover"
          />
        </Pressable>
        <View style={styles.imageRow}>
          <Pressable style={{ flex: 1 }} onPress={() => openLightbox(post, 1)}>
            <Image
              source={{ uri: urls[1] }}
              style={styles.gridImageThird}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => openLightbox(post, 2)}>
            <Image
              source={{ uri: urls[2] }}
              style={styles.gridImageThird}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => openLightbox(post, 3)}>
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
          </Pressable>
        </View>
      </View>
    );
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
      <Pressable style={styles.card} onPress={handleAdClick}>
        <View style={styles.cardHeader}>
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
            <View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={styles.authorName}>{displayName}</Text>
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
            <View style={styles.adMediaBox}>
              <Image
                source={{ uri: ad.mediaUrl }}
                style={styles.singleImage}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.adCtaRow}>
            <Text style={styles.adDestinationText} numberOfLines={1}>
              {displayUrl}
            </Text>

            {/* Đổi từ Pressable thành View vì toàn bộ Card đã click được rồi */}
            <View style={styles.adCtaButton}>
              <Text style={styles.adCtaButtonText}>Xem ngay</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };
  const renderPostCard = ({ item }: { item: PostResponse }) => {
    const isPostOwner =
      account?.id === item.authorUserId ||
      (account as any)?.profile?.id === item.authorUserId;
    const isOpenMenu = optionsPostId === item.id;
    const isSaved = (item as any).isSaved;
    const isFavorited = (item as any).isFavorited;

    // Ưu tiên hiển thị Nickname
    const displayName = (item as any).authorNickname || item.authorName;

    return (
      <View
        style={[styles.card, isOpenMenu && { zIndex: 9999, elevation: 10 }]}
      >
        <View style={[styles.cardHeader, isOpenMenu && { zIndex: 9999 }]}>
          <Pressable
            style={styles.authorInfo}
            onPress={() => setDetailPostId(item.id)}
          >
            <View style={[styles.avatarPlaceholder, { overflow: "hidden" }]}>
              {item.authorAvatar ? (
                <Image
                  source={{ uri: item.authorAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {displayName?.charAt(0)?.toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              <Text style={styles.postDate}>
                {new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </Pressable>

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
                            setEditingPost(item);
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

                    {!isPostOwner && (
                      <Pressable
                        onPress={() => {
                          setOptionsPostId(null);
                          setReportPostId(item.id); // Mở Modal báo cáo
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          Báo cáo bài viết
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <Pressable onPress={() => setDetailPostId(item.id)}>
          <ExpandableDescription text={item.description || ""} />
        </Pressable>

        <View style={styles.mediaContainer}>{renderMedia(item)}</View>

        <View style={styles.cardFooter}>
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
          <Pressable
            style={styles.actionBtn}
            onPress={() => setDetailPostId(item.id)}
          >
            <SymbolView
              name={{
                ios: "bubble.right.fill",
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
      <Modal
        visible={selectedImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.lightboxOverlay}>
          <Pressable
            style={styles.lightboxCloseBtn}
            onPress={() => setSelectedImageIndex(null)}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={28}
              tintColor="#FFF"
            />
          </Pressable>

          {selectedImageIndex !== null && lightboxPost?.mediaUrls && (
            <View style={styles.lightboxContent}>
              {lightboxPost.mediaUrls.length > 1 && (
                <Pressable
                  style={[styles.lightboxNavBtn, { left: 20 }]}
                  onPress={() =>
                    setSelectedImageIndex((prev) =>
                      prev !== null && prev > 0
                        ? prev - 1
                        : (lightboxPost.mediaUrls?.length ?? 1) - 1,
                    )
                  }
                >
                  <SymbolView
                    name={{
                      ios: "chevron.left",
                      android: "chevron_left",
                      web: "chevron_left",
                    }}
                    size={36}
                    tintColor="#FFF"
                  />
                </Pressable>
              )}

              <Image
                source={{ uri: lightboxPost.mediaUrls[selectedImageIndex] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />

              {lightboxPost.mediaUrls.length > 1 && (
                <Pressable
                  style={[styles.lightboxNavBtn, { right: 20 }]}
                  onPress={() =>
                    setSelectedImageIndex((prev) =>
                      prev !== null &&
                      prev < (lightboxPost.mediaUrls?.length ?? 1) - 1
                        ? prev + 1
                        : 0,
                    )
                  }
                >
                  <SymbolView
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={36}
                    tintColor="#FFF"
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Modal>
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
    gap: 10, // Thu nhỏ gap gốc của bài viết
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F3F4F6",
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

  description: { fontSize: 14, lineHeight: 20, color: "#1F2937" },
  seeMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },

  mediaContainer: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#111827", // Lớp phủ trống cho phần dư của ảnh contain
  },
  singleImage: { width: "100%", height: 280, resizeMode: "contain" }, // Fix 280px + contain

  imageGrid: {
    width: "100%",
    overflow: "hidden",
    gap: 2,
    backgroundColor: "#FFF",
  }, // Nền trắng chia ô
  imageRow: { flexDirection: "row", gap: 2 },
  gridImageHalf: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 180,
    resizeMode: "cover",
  },
  gridImageMain: { width: "100%", height: 200, resizeMode: "cover" },
  gridImageHalfBottom: {
    flex: 1,
    aspectRatio: 4 / 3,
    maxHeight: 130,
    resizeMode: "cover",
  },
  gridImageThirdContainer: { flex: 1, aspectRatio: 1, maxHeight: 130 },
  gridImageThird: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 130,
    resizeMode: "cover",
  },

  moreImagesOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreImagesText: { color: "#FFF", fontSize: 20, fontWeight: "700" },

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
    minWidth: 160,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  optionText: { fontSize: 14, fontWeight: "500" },

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

  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 40,
    right: 30,
    zIndex: 10,
    padding: 10,
  },
  lightboxContent: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  lightboxImage: { width: "85%", height: "100%" },
  lightboxNavBtn: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },

  // Ad Specific Styles
  adMediaBox: { width: "100%" },
  adCtaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  adDestinationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    marginRight: 10,
  },
  adCtaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adCtaButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
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
