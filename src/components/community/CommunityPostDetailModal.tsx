import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import {
  communityService,
  type CommentResponse,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { usePathname, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CommentItem } from "./CommentItem"; // Import CommentItem

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEIGHT_FULL = SCREEN_HEIGHT * 0.92;
const HEIGHT_CLOSED = 0;

interface PostDetailModalProps {
  postId: string | null;
  initialPost?: PostResponse | null;
  onClose: () => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: PostResponse) => void; // <--- Thêm dòng này vào
}

export function PostDetailModal({
  postId,
  initialPost,
  onClose,
  onPostDeleted,
  onPostUpdated,
}: PostDetailModalProps) {
  const { account } = useAuthStore();

  const [post, setPost] = useState<PostResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
    authorUserId: string;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const [optionsCommentId, setOptionsCommentId] = useState<string | null>(null);
  const [optionsPostOpen, setOptionsPostOpen] = useState(false);
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<
    string | null
  >(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState(false);

  const abortController = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const sheetHeight = useRef(new Animated.Value(HEIGHT_CLOSED)).current;

  const router = useRouter();
  const pathname = usePathname();

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const animateToHeight = useCallback(
    (toValue: number, onComplete?: () => void) => {
      Animated.spring(sheetHeight, {
        toValue,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start(onComplete);
    },
    [sheetHeight],
  );

  const handleDismiss = useCallback(() => {
    animateToHeight(HEIGHT_CLOSED, () => {
      if (Platform.OS === "web") {
        window.history.replaceState(null, "", pathname);
      } else {
        router.setParams({ postId: undefined });
      }
      onClose();
    });
  }, [animateToHeight, onClose, router, pathname]);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setComments([]);
      sheetHeight.setValue(HEIGHT_CLOSED);
      return;
    }

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const fetchDetailData = async () => {
      setLoading(true);
      setError("");

      // 1. Hiển thị bài viết ngay lập tức nếu đã có dữ liệu truyền vào (từ Feed)
      if (initialPost && initialPost.id === postId) {
        setPost(initialPost);
      }

      try {
        if (!postId.startsWith("temp-")) {
          const commentsData = await communityService.getComments(
            postId,
            controller.signal,
          );
          setComments(Array.isArray(commentsData) ? commentsData : []);
        } else {
          setComments([]);
        }
      } catch (cause: any) {
        // KIỂM TRA NGẶT NGHÈO LỖI ABORT
        const isAbortError =
          cause?.name === "AbortError" ||
          cause?.message?.includes("aborted") ||
          controller.signal.aborted;

        if (!isAbortError) {
          // CHỈ gọi hàm hiển thị thông báo (toast/console) nếu KHÔNG PHẢI lỗi hủy API
          console.error("Lỗi lấy bình luận:", cause);
          // showToastError("Lỗi lấy bình luận..."); // Giữ nguyên hàm show thông báo của bạn ở đây
          setComments([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDetailData();
    sheetHeight.setValue(HEIGHT_CLOSED);
    requestAnimationFrame(() => animateToHeight(HEIGHT_FULL));

    return () => controller.abort();
  }, [postId, initialPost, animateToHeight, sheetHeight]);

  // HÀM THÍCH BÀI VIẾT
  const handleToggleReaction = async () => {
    if (!post) return;
    try {
      await communityService.toggleReact(post.id);
      setPost((prev) => {
        if (!prev) return null;
        const isFavorited = !(prev as any).isFavorited;
        const newPost = {
          ...prev,
          isFavorited,
          favoriteCount: isFavorited
            ? prev.favoriteCount + 1
            : Math.max(0, prev.favoriteCount - 1),
        };

        // Báo ngay về CommunityScreen để cập nhật Feed ngoài
        onPostUpdated?.(newPost);
        return newPost;
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thực hiện thích bài viết.");
    }
  };

  // HÀM LƯU BÀI VIẾT (BOOKMARK)
  const handleToggleBookmark = async () => {
    if (!post) return;
    try {
      const response: any = await communityService.toggleBookmark(post.id);
      const messageStatus = response?.message; // "Saved" hoặc "Unsaved"
      const isNowSaved = messageStatus === "Saved";

      setPost((prev) => {
        if (!prev) return null;
        const newPost = { ...prev, isSaved: isNowSaved };

        // Báo ngay về CommunityScreen để cập nhật Feed ngoài
        onPostUpdated?.(newPost);
        return newPost;
      });

      Alert.alert(
        "Thành công",
        messageStatus === "Saved" ? "Đã lưu bài viết." : "Đã hủy lưu bài viết.",
      );
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thực hiện lưu bài viết.");
    }
  };

  const appendReplyFlattened = (
    list: CommentResponse[],
    targetId: string,
    reply: CommentResponse,
  ) => {
    return list.map((c) => {
      if (c.id === targetId || c.replies?.some((r) => r.id === targetId)) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    });
  };

  const removeCommentFromTree = (
    list: CommentResponse[],
    id: string,
  ): CommentResponse[] => {
    return list
      .filter((c) => c.id !== id)
      .map((c) => ({
        ...c,
        replies: c.replies ? removeCommentFromTree(c.replies, id) : [],
      }));
  };

  const handleSubmitComment = async () => {
    const text = inputText.trim();
    if (!text || sending || !post) return;
    setSending(true);

    try {
      if (editingComment) {
        const res = await communityService.updateComment(editingComment.id, {
          content: text,
        });
        const updated = (res as any)?.data ?? res;
        setComments((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        );
        setEditingComment(null);
      } else if (replyingTo) {
        const res = await communityService.createReply(replyingTo.commentId, {
          content: text,
          replyToUserId: replyingTo.authorUserId,
        });
        const rawReply = (res as any)?.data ?? res;
        setComments((prev) =>
          appendReplyFlattened(prev, replyingTo.commentId, {
            ...rawReply,
            content: text,
            replies: [],
          }),
        );
        setReplyingTo(null);
      } else {
        const res = await communityService.createComment(post.id, {
          content: text,
        });
        const rawComment = (res as any)?.data ?? res;
        setComments((prev) => [
          { ...rawComment, content: text, replies: [] },
          ...prev,
        ]);
      }
      setInputText("");
    } catch {
      Alert.alert("Lỗi", "Không thể gửi bình luận.");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDeletePost = async () => {
    if (!post) return;

    // 1. ĐÓNG POPUP XÁC NHẬN NGAY LẬP TỨC
    // (Hãy thay setIsDeleteConfirmVisible bằng đúng tên state quản lý popup của bạn)
    setDeleteConfirmPost(false);

    try {
      if (!post.id.startsWith("temp-")) {
        await communityService.deletePost(post.id);
      }

      onPostDeleted?.(post.id);
      handleDismiss(); // Đóng PostDetailModal
    } catch {
      Alert.alert("Lỗi", "Không thể xóa bài viết.");
    }
  };
  const handleEditComment = (comment: CommentResponse) => {
    setEditingComment({ id: comment.id, content: comment.content });
    setInputText(comment.content);
  };

  const handleReplyComment = (
    commentId: string,
    authorName: string,
    authorUserId: string,
  ) => {
    setEditingComment(null);
    setReplyingTo({ commentId, authorName, authorUserId });
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteConfirmCommentId(commentId);
  };

  const renderMedia = (urls?: string[]) => {
    if (!urls || urls.length === 0) return null;

    if (urls.length === 1)
      return (
        <Pressable onPress={() => setSelectedImageIndex(0)}>
          <Image
            source={{ uri: urls[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </Pressable>
      );

    if (urls.length === 2)
      return (
        <View style={styles.imageGrid}>
          <View style={styles.imageRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setSelectedImageIndex(0)}
            >
              <Image
                source={{ uri: urls[0] }}
                style={styles.gridImageHalf}
                resizeMode="cover"
              />
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setSelectedImageIndex(1)}
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
          <Pressable onPress={() => setSelectedImageIndex(0)}>
            <Image
              source={{ uri: urls[0] }}
              style={styles.gridImageMain}
              resizeMode="cover"
            />
          </Pressable>
          <View style={styles.imageRow}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setSelectedImageIndex(1)}
            >
              <Image
                source={{ uri: urls[1] }}
                style={styles.gridImageHalfBottom}
                resizeMode="cover"
              />
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setSelectedImageIndex(2)}
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
        <Pressable onPress={() => setSelectedImageIndex(0)}>
          <Image
            source={{ uri: urls[0] }}
            style={styles.gridImageMain}
            resizeMode="cover"
          />
        </Pressable>
        <View style={styles.imageRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setSelectedImageIndex(1)}
          >
            <Image
              source={{ uri: urls[1] }}
              style={styles.gridImageThird}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setSelectedImageIndex(2)}
          >
            <Image
              source={{ uri: urls[2] }}
              style={styles.gridImageThird}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setSelectedImageIndex(3)}
          >
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

  const isPostOwner =
    account?.id === post?.authorUserId ||
    (account as any)?.profile?.id === post?.authorUserId;

  const isFavorited = (post as any)?.isFavorited;
  const isSaved = (post as any)?.isSaved;

  return (
    <>
      <Modal
        visible={!!postId}
        transparent
        animationType="none"
        onRequestClose={handleDismiss}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.backdrop} onPress={handleDismiss} />

          <Animated.View
            style={[styles.sheetContainer, { height: sheetHeight }]}
          >
            <View style={styles.dragHeaderArea}>
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
                <Pressable onPress={handleDismiss} style={styles.closeBtn}>
                  <SymbolView
                    name={{ ios: "xmark", android: "close", web: "close" }}
                    size={20}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {loading && !post ? (
              <ActivityIndicator
                style={{ marginTop: 40 }}
                size="large"
                color={colors.primary}
              />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView
                style={styles.scrollFlex}
                contentContainerStyle={{ paddingBottom: 24 }}
                onScroll={() => {
                  setOptionsCommentId(null);
                  setOptionsPostOpen(false);
                }}
                scrollEventThrottle={16}
              >
                {/* 1. Phần hiển thị POST */}
                {post && (
                  <View
                    style={[
                      styles.postSection,
                      optionsPostOpen && { zIndex: 9999, elevation: 10 },
                    ]}
                  >
                    <View
                      style={[
                        styles.postHeader,
                        optionsPostOpen && { zIndex: 9999, elevation: 10 },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {post.authorName?.charAt(0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.postAuthor}>
                            {post.authorName}
                          </Text>
                          <Text style={styles.timeText}>
                            {new Date(post.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </Text>
                        </View>
                      </View>

                      {/* Menu 3 chấm (Lưu bài viết & Xóa bài viết nếu là chủ) */}
                      <View
                        style={[
                          styles.menuAnchor,
                          optionsPostOpen && { zIndex: 9999, elevation: 10 },
                        ]}
                      >
                        <Pressable
                          onPress={() => setOptionsPostOpen(!optionsPostOpen)}
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

                        {optionsPostOpen && (
                          <>
                            <Pressable
                              style={styles.dropdownBackdrop}
                              onPress={() => setOptionsPostOpen(false)}
                            />
                            <View style={styles.dropdownContainerRight}>
                              <View
                                style={[
                                  styles.tooltipArrow,
                                  {
                                    marginLeft: 0,
                                    alignSelf: "flex-end",
                                    marginRight: 10,
                                  },
                                ]}
                              />
                              <View
                                style={[styles.dropdownMenu, { minWidth: 160 }]}
                              >
                                {/* Option Lưu bài viết */}
                                <Pressable
                                  onPress={() => {
                                    setOptionsPostOpen(false);
                                    handleToggleBookmark();
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <Text style={styles.optionText}>
                                    {isSaved
                                      ? "Bỏ lưu bài viết"
                                      : "Lưu bài viết"}
                                  </Text>
                                </Pressable>

                                {/* Option Xóa bài viết (Chỉ chủ bài viết mới thấy) */}
                                {isPostOwner && (
                                  <Pressable
                                    onPress={() => {
                                      setOptionsPostOpen(false);
                                      setDeleteConfirmPost(true);
                                    }}
                                    style={styles.dropdownItem}
                                  >
                                    <Text
                                      style={[
                                        styles.optionText,
                                        { color: colors.error },
                                      ]}
                                    >
                                      Xóa bài viết
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    <Text style={styles.postDescription}>
                      {post.description}
                    </Text>
                    {renderMedia(post.mediaUrls)}

                    {/* Footer tương tác độc lập (Nút Thích độc lập) */}
                    <View style={styles.postFooter}>
                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onPress={handleToggleReaction}
                      >
                        <SymbolView
                          name={{
                            ios: isFavorited ? "heart.fill" : "heart",
                            android: isFavorited
                              ? "favorite"
                              : "favorite_border",
                            web: isFavorited ? "favorite" : "favorite_border",
                          }}
                          size={18}
                          tintColor={
                            isFavorited ? "#EF4444" : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.timeText,
                            isFavorited && {
                              color: "#EF4444",
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {post.favoriteCount}
                        </Text>
                      </Pressable>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
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
                        <Text style={styles.timeText}>{comments.length}</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* 2. Phần hiển thị COMMENTS */}
                <View style={styles.commentsSection}>
                  {comments.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có bình luận nào.</Text>
                  ) : (
                    comments.map((comment, index) => {
                      const isTreeOpen =
                        optionsCommentId === comment.id ||
                        comment.replies?.some((r) => r.id === optionsCommentId);

                      return (
                        <View
                          key={comment.id || index}
                          style={
                            isTreeOpen
                              ? { zIndex: 9999, elevation: 10 }
                              : { zIndex: 1 }
                          }
                        >
                          <CommentItem
                            comment={comment}
                            optionsCommentId={optionsCommentId}
                            setOptionsCommentId={setOptionsCommentId}
                            onEdit={handleEditComment}
                            onDelete={handleDeleteComment}
                            onReply={handleReplyComment}
                          />
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}

            {/* Input Nhập Bình Luận */}
            {(replyingTo || editingComment) && (
              <View style={styles.bannerBar}>
                <Text style={styles.bannerText}>
                  {editingComment
                    ? "Đang sửa bình luận"
                    : `Đang phản hồi ${replyingTo?.authorName}`}
                </Text>
                <Pressable
                  onPress={() => {
                    setReplyingTo(null);
                    setEditingComment(null);
                    setInputText("");
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "xmark.circle.fill",
                      android: "cancel",
                      web: "cancel",
                    }}
                    size={18}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>
            )}
            <View style={styles.inputBar}>
              <TextInput
                ref={textInputRef}
                style={styles.input}
                placeholder="Viết bình luận..."
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!sending}
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={sending || !inputText.trim()}
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || sending) && styles.sendBtnDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <SymbolView
                    name={{
                      ios: "paperplane.fill",
                      android: "send",
                      web: "send",
                    }}
                    size={16}
                    tintColor="#FFF"
                  />
                )}
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Xác nhận Xóa Bình Luận */}
      <Modal
        visible={!!deleteConfirmCommentId}
        transparent
        animationType="fade"
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Xóa bình luận?</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 10,
              }}
            >
              <Button
                title="Hủy"
                style={{ backgroundColor: "#F3F4F6" }}
                textStyle={{ color: colors.textPrimary }}
                onPress={() => setDeleteConfirmCommentId(null)}
              />
              <Button
                title="Xóa"
                style={{ backgroundColor: colors.error }}
                onPress={async () => {
                  if (deleteConfirmCommentId) {
                    await communityService.deleteComment(
                      deleteConfirmCommentId,
                    );
                    setComments((prev) =>
                      removeCommentFromTree(prev, deleteConfirmCommentId),
                    );
                    setDeleteConfirmCommentId(null);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Xác nhận Xóa Bài Viết */}
      <Modal visible={deleteConfirmPost} transparent animationType="fade">
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
              <Button
                title="Hủy"
                style={{ backgroundColor: "#F3F4F6" }}
                textStyle={{ color: colors.textPrimary }}
                onPress={() => setDeleteConfirmPost(false)}
              />
              <Button
                title="Xóa"
                style={{ backgroundColor: colors.error }}
                onPress={handleConfirmDeletePost}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* OVERLAY XEM ẢNH PHÓNG TO (LIGHTBOX) */}
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
              size={24}
              tintColor="#FFF"
            />
          </Pressable>

          {selectedImageIndex !== null && post?.mediaUrls && (
            <View style={styles.lightboxContent}>
              {post.mediaUrls.length > 1 && (
                <Pressable
                  style={[styles.lightboxNavBtn, { left: 20 }]}
                  onPress={() => {
                    setSelectedImageIndex((prev) =>
                      prev !== null && prev > 0
                        ? prev - 1
                        : (post.mediaUrls?.length ?? 1) - 1,
                    );
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "chevron.left",
                      android: "chevron_left",
                      web: "chevron_left",
                    }}
                    size={30}
                    tintColor="#FFF"
                  />
                </Pressable>
              )}

              <Image
                source={{ uri: post.mediaUrls[selectedImageIndex] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />

              {post.mediaUrls.length > 1 && (
                <Pressable
                  style={[styles.lightboxNavBtn, { right: 20 }]}
                  onPress={() => {
                    setSelectedImageIndex((prev) =>
                      prev !== null && prev < (post.mediaUrls?.length ?? 1) - 1
                        ? prev + 1
                        : 0,
                    );
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={30}
                    tintColor="#FFF"
                  />
                </Pressable>
              )}
            </View>
          )}

          {post?.mediaUrls &&
            post.mediaUrls.length > 1 &&
            selectedImageIndex !== null && (
              <Text style={styles.lightboxCounter}>
                {selectedImageIndex + 1} / {post.mediaUrls.length}
              </Text>
            )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHeaderArea: {
    paddingTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 6,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
    position: "relative",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  closeBtn: { position: "absolute", right: 16, bottom: 8, padding: 4 },
  scrollFlex: { flex: 1 },

  postSection: { padding: 16, gap: 12 },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  postAuthor: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  postDescription: { fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  postFooter: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#F3F4F6",
  },
  divider: { height: 6, backgroundColor: "#F3F4F6" },
  timeText: { fontSize: 12, color: colors.textSecondary },

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

  commentsSection: {
    padding: 16,
    gap: 16,
    paddingBottom: 100, // <--- Thêm khoảng trống đủ lớn (100px) ở cuối danh sách bình luận
  },

  menuAnchor: { position: "relative" },
  iconBtnSmall: { padding: 4 },
  dropdownBackdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "transparent",
  },
  dropdownContainer: { position: "absolute", top: 32, left: 0, zIndex: 1000 },
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
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dropdownMenu: {
    minWidth: 220,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionText: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },

  bannerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#EEF2FF",
  },
  bannerText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#D1D5DB" },

  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: 20,
  },
  errorText: { textAlign: "center", color: colors.error, marginTop: 20 },

  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  popupContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  popupTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
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
  lightboxImage: {
    width: "85%",
    height: "100%",
  },
  lightboxNavBtn: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  lightboxCounter: {
    position: "absolute",
    bottom: 30,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
