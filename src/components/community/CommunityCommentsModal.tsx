import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import {
  communityService,
  type CommentResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
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
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Chiều cao cho các mức Mở rộng, Nửa màn hình và Đóng
const HEIGHT_FULL = SCREEN_HEIGHT * 0.88;
const HEIGHT_HALF = SCREEN_HEIGHT * 0.55;
const HEIGHT_CLOSED = 0;

interface CommunityCommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export function CommunityCommentsModal({
  visible,
  postId,
  onClose,
  onCommentCountChange,
}: CommunityCommentsModalProps) {
  const { width } = useWindowDimensions();
  const { account } = useAuthStore();
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
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

  // States quản lý tùy chọn & Xóa bình luận
  const [optionsCommentId, setOptionsCommentId] = useState<string | null>(null);
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<
    string | null
  >(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const abortController = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Animated Value điều khiển CHIỀU CAO của khung Modal
  const sheetHeight = useRef(new Animated.Value(HEIGHT_CLOSED)).current;
  const currentSnapHeight = useRef(HEIGHT_HALF);

  // Hàm thay đổi chiều cao khung mượt mà
  const animateToHeight = useCallback(
    (toValue: number, onComplete?: () => void) => {
      currentSnapHeight.current = toValue;
      Animated.spring(sheetHeight, {
        toValue,
        useNativeDriver: false,
        friction: 8,
        tension: 75,
      }).start(onComplete);
    },
    [sheetHeight],
  );

  // Đóng Modal mượt mà
  const handleDismiss = useCallback(() => {
    animateToHeight(HEIGHT_CLOSED, () => {
      onClose();
    });
  }, [animateToHeight, onClose]);

  // Bộ xử lý cử chỉ vuốt Trượt (PanResponder)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        sheetHeight.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        sheetHeight.setValue(-gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        sheetHeight.flattenOffset();
        const { dy, vy } = gestureState;

        if (currentSnapHeight.current === HEIGHT_HALF) {
          if (dy < -25 || vy < -0.25) {
            animateToHeight(HEIGHT_FULL);
          } else if (dy > 25 || vy > 0.25) {
            handleDismiss();
          } else {
            animateToHeight(HEIGHT_HALF);
          }
        } else {
          if (dy > 35 || vy > 0.35) {
            animateToHeight(HEIGHT_HALF);
          } else {
            animateToHeight(HEIGHT_FULL);
          }
        }
      },
    }),
  ).current;

  // Format thời gian an toàn tránh lỗi Invalid Date
  const formatCommentDate = (dateStr?: string) => {
    if (!dateStr) return "Vừa xong";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Vừa xong";
    return d.toLocaleDateString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Helper: Chèn reply mới phẳng vào Bình luận gốc (Level 1)
  const appendReplyFlattened = (
    list: CommentResponse[],
    targetCommentId: string,
    newReply: CommentResponse,
  ): CommentResponse[] => {
    return list.map((rootComment) => {
      if (rootComment.id === targetCommentId) {
        return {
          ...rootComment,
          replies: [...(rootComment.replies || []), newReply],
        };
      }

      const isChildOfThisRoot = rootComment.replies?.some(
        (r) => r.id === targetCommentId,
      );

      if (isChildOfThisRoot) {
        return {
          ...rootComment,
          replies: [...(rootComment.replies || []), newReply],
        };
      }

      return rootComment;
    });
  };

  // Helper: Cập nhật comment trong cây
  const updateCommentInTree = (
    list: CommentResponse[],
    updated: CommentResponse,
  ): CommentResponse[] => {
    return list.map((item) => {
      if (item.id === updated.id) return { ...item, ...updated };
      if (item.replies && item.replies.length > 0) {
        return { ...item, replies: updateCommentInTree(item.replies, updated) };
      }
      return item;
    });
  };

  // Helper: Xóa comment khỏi cây
  const removeCommentFromTree = (
    list: CommentResponse[],
    id: string,
  ): CommentResponse[] => {
    return list
      .filter((item) => item.id !== id)
      .map((item) => ({
        ...item,
        replies: item.replies ? removeCommentFromTree(item.replies, id) : [],
      }));
  };

  // Tải danh sách bình luận
  const loadComments = useCallback(async () => {
    if (!postId) return;

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    setLoading(true);
    setError("");

    try {
      const data = await communityService.getComments(
        postId,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải danh sách bình luận.",
        );
      }
    } finally {
      if (controller === abortController.current) {
        setLoading(false);
      }
    }
  }, [postId]);

  useEffect(() => {
    if (visible) {
      loadComments();
      sheetHeight.setValue(HEIGHT_CLOSED);
      requestAnimationFrame(() => {
        animateToHeight(HEIGHT_HALF);
      });
    } else {
      setComments([]);
      setInputText("");
      setReplyingTo(null);
      setEditingComment(null);
      setOptionsCommentId(null);
      setDeleteConfirmCommentId(null);
      sheetHeight.setValue(HEIGHT_CLOSED);
    }
    return () => {
      abortController.current?.abort();
    };
  }, [visible, loadComments, animateToHeight, sheetHeight]);

  // Gửi bình luận / Reply / Sửa
  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    const controller = new AbortController();

    try {
      if (editingComment) {
        const res = await communityService.updateComment(
          editingComment.id,
          { content: text },
          controller.signal,
        );
        const updated: CommentResponse = (res as any)?.data ?? res;
        setComments((prev) => updateCommentInTree(prev, updated));
        setEditingComment(null);
      } else if (replyingTo) {
        const res = await communityService.createReply(
          replyingTo.commentId,
          { content: text, replyToUserId: replyingTo.authorUserId },
          controller.signal,
        );
        const rawReply: CommentResponse = (res as any)?.data ?? res;

        // Bổ sung Fallback Data tránh lỗi thiếu thông tin
        const reply: CommentResponse = {
          ...rawReply,
          content: rawReply.content || text,
          authorName:
            rawReply.authorName ||
            (account as any)?.fullName ||
            (account as any)?.userName ||
            "Bạn",
          authorAvatarUrl:
            rawReply.authorAvatarUrl || (account as any)?.avatarUrl || null,
          authorUserId: rawReply.authorUserId || account?.id || "",
          createdAt:
            rawReply.createdAt && !isNaN(new Date(rawReply.createdAt).getTime())
              ? rawReply.createdAt
              : new Date().toISOString(),
          replyToUserName:
            (rawReply as any)?.replyToUserName || replyingTo.authorName,
          replies: [],
        };

        setComments((prev) =>
          appendReplyFlattened(prev, replyingTo.commentId, reply),
        );
        onCommentCountChange?.(1);
        setReplyingTo(null);
      } else {
        const res = await communityService.createComment(
          postId,
          { content: text },
          controller.signal,
        );
        const rawComment: CommentResponse = (res as any)?.data ?? res;

        // Bổ sung Fallback Data tránh lỗi thiếu thông tin
        const newComment: CommentResponse = {
          ...rawComment,
          content: rawComment.content || text,
          authorName:
            rawComment.authorName ||
            (account as any)?.fullName ||
            (account as any)?.userName ||
            "Bạn",
          authorAvatarUrl:
            rawComment.authorAvatarUrl || (account as any)?.avatarUrl || null,
          authorUserId: rawComment.authorUserId || account?.id || "",
          createdAt:
            rawComment.createdAt &&
            !isNaN(new Date(rawComment.createdAt).getTime())
              ? rawComment.createdAt
              : new Date().toISOString(),
          replies: rawComment.replies || [],
        };

        setComments((prev) => [newComment, ...prev]);
        onCommentCountChange?.(1);
      }
      setInputText("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể gửi bình luận. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };

  // Xử lý xác nhận xóa bình luận
  const handleConfirmDelete = async () => {
    if (!deleteConfirmCommentId) return;

    setDeletingComment(true);
    try {
      await communityService.deleteComment(deleteConfirmCommentId);
      setComments((prev) =>
        removeCommentFromTree(prev, deleteConfirmCommentId),
      );
      onCommentCountChange?.(-1);
      setDeleteConfirmCommentId(null);
    } catch (cause) {
      console.error("Lỗi xóa bình luận:", cause);
      Alert.alert("Lỗi", "Không thể xóa bình luận. Vui lòng thử lại.");
    } finally {
      setDeletingComment(false);
    }
  };

  const startReply = (
    commentId: string,
    authorName: string,
    authorUserId: string,
  ) => {
    setEditingComment(null);
    setReplyingTo({ commentId, authorName, authorUserId });
    textInputRef.current?.focus();
  };

  const startEdit = (comment: CommentResponse) => {
    setReplyingTo(null);
    setEditingComment({ id: comment.id, content: comment.content });
    setInputText(comment.content);
    textInputRef.current?.focus();
  };

  const cancelAction = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setInputText("");
  };

  // Render Comment & Reply phẳng tối đa 2 cấp
  const renderCommentItem = (comment: CommentResponse, isReply = false) => {
    const isOwner =
      account?.id === comment.authorUserId ||
      (account as any)?.profile?.id === comment.authorUserId;
    const safeReplies = Array.isArray(comment.replies) ? comment.replies : [];
    const hasReplies = !isReply && safeReplies.length > 0;

    const replyToName = (comment as any)?.replyToUserName;

    return (
      <View
        style={[
          styles.commentRow,
          optionsCommentId === comment.id && { zIndex: 9999 },
        ]}
      >
        <View style={styles.commentMain}>
          <View style={styles.avatarContainer}>
            {comment.authorAvatarUrl ? (
              <Image
                source={{ uri: comment.authorAvatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {comment.authorName?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.commentBody}>
            {/* Thêm View bọc Bubble và Icon 3 chấm nằm ngang */}
            <View style={styles.bubbleRow}>
              <View style={styles.bubble}>
                <Text style={styles.authorName}>{comment.authorName}</Text>
                <Text style={styles.commentContent}>
                  {replyToName && (
                    <Text style={styles.mentionText}>@{replyToName} </Text>
                  )}
                  {comment.content}
                </Text>
              </View>

              {/* Nút 3 chấm và Menu Dropdown */}
              {isOwner && (
                <View
                  style={[
                    styles.menuAnchor,
                    optionsCommentId === comment.id && styles.menuAnchorActive,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setOptionsCommentId((prev) =>
                        prev === comment.id ? null : comment.id,
                      )
                    }
                    style={({ pressed }) => [
                      styles.iconBtnSmall,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: "ellipsis",
                        android: "more_horiz",
                        web: "more_horiz",
                      }}
                      size={18}
                      tintColor={colors.textSecondary}
                    />
                  </Pressable>

                  {/* Menu Dropdown tại chỗ */}
                  {optionsCommentId === comment.id && (
                    <>
                      {/* LỚP PHỦ VÔ HÌNH: Bắt sự kiện click ra ngoài để đóng menu */}
                      <Pressable
                        style={styles.dropdownBackdrop}
                        onPress={() => setOptionsCommentId(null)}
                      />

                      <View style={styles.dropdownMenu}>
                        <Pressable
                          onPress={() => {
                            setOptionsCommentId(null);
                            startEdit(comment);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            pressed && styles.pressed,
                          ]}
                        >
                          <SymbolView
                            name={{
                              ios: "pencil",
                              android: "edit",
                              web: "edit",
                            }}
                            size={14}
                            tintColor={colors.textPrimary}
                          />
                          <Text style={styles.optionText}>Sửa</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            setOptionsCommentId(null);
                            setDeleteConfirmCommentId(comment.id);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            pressed && styles.pressed,
                          ]}
                        >
                          <SymbolView
                            name={{
                              ios: "trash",
                              android: "delete",
                              web: "delete",
                            }}
                            size={14}
                            tintColor={colors.error}
                          />
                          <Text style={styles.deleteOptionText}>
                            Xóa bình luận
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Hàng thả tim / phản hồi / thời gian giữ nguyên bên dưới */}
            <View style={styles.actionRow}>
              <Text style={styles.timeText}>
                {formatCommentDate(comment.createdAt)}
              </Text>

              <Pressable
                onPress={() =>
                  startReply(
                    comment.id,
                    comment.authorName,
                    comment.authorUserId,
                  )
                }
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Text style={styles.replyBtnText}>Phản hồi</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Khối liên kết đường nối dọc xuống các reply Level 2 */}
        {hasReplies && (
          <View style={styles.repliesContainer}>
            <View style={styles.verticalThreadLine} />
            {safeReplies.map((reply, index) => (
              <View
                key={reply.id || `reply-${index}-${reply.createdAt}`}
                // QUAN TRỌNG: Đẩy Z-Index của reply đang mở menu lên cao nhất
                style={[
                  styles.replyWrapper,
                  optionsCommentId === reply.id && {
                    zIndex: 9999,
                    elevation: 10,
                  },
                ]}
              >
                <View style={styles.horizontalBranchLine} />
                {renderCommentItem(reply, true)}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const backdropOpacity = sheetHeight.interpolate({
    inputRange: [HEIGHT_CLOSED, HEIGHT_HALF, HEIGHT_FULL],
    outputRange: [0, 0.35, 0.5],
    extrapolate: "clamp",
  });

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleDismiss}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Nền mờ phía sau */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismiss}
            />
          </Animated.View>

          {/* Khối Bottom Sheet */}
          <Animated.View
            style={[styles.sheetContainer, { height: sheetHeight }]}
          >
            {/* Header & Thanh Kéo xám gắn Gesture */}
            <View style={styles.dragHeaderArea} {...panResponder.panHandlers}>
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Bình luận</Text>
                {width >= 768 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đóng bình luận"
                    onPress={handleDismiss}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "xmark", android: "close", web: "close" }}
                      size={20}
                      tintColor={colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Danh sách bình luận */}
            {loading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : error ? (
              <View style={styles.stateContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.stateContainer}>
                <SymbolView
                  name={{
                    ios: "bubble.left",
                    android: "comment",
                    web: "comment",
                  }}
                  size={40}
                  tintColor={colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  Chưa có bình luận nào. Hãy là người đầu tiên!
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollFlex}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                // Thêm 2 dòng này để tự động đóng menu khi người dùng vuốt danh sách
                onScroll={() => {
                  if (optionsCommentId) setOptionsCommentId(null);
                }}
                scrollEventThrottle={16}
              >
                {comments.map((comment, index) => (
                  <View
                    key={comment.id || `comment-${index}-${comment.createdAt}`}
                    // QUAN TRỌNG: Đẩy Z-Index của comment đang mở menu lên trên các comment bên dưới
                    style={
                      optionsCommentId === comment.id
                        ? { zIndex: 9999, elevation: 10 }
                        : { zIndex: 1 }
                    }
                  >
                    {renderCommentItem(comment)}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Banner Trả lời / Sửa */}
            {(replyingTo || editingComment) && (
              <View style={styles.bannerBar}>
                <Text style={styles.bannerText}>
                  {editingComment
                    ? "Đang chỉnh sửa bình luận"
                    : `Đang phản hồi ${replyingTo?.authorName}`}
                </Text>
                <Pressable onPress={cancelAction}>
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

            {/* Ô Nhập Nội dung */}
            <View style={styles.inputBar}>
              <TextInput
                ref={textInputRef}
                style={styles.input}
                placeholder={
                  editingComment
                    ? "Sửa bình luận..."
                    : replyingTo
                      ? `Trả lời ${replyingTo.authorName}...`
                      : "Viết bình luận..."
                }
                placeholderTextColor={colors.textMuted || "#9CA3AF"}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!sending}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi"
                onPress={handleSubmit}
                disabled={sending || !inputText.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!inputText.trim() || sending) && styles.sendBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SymbolView
                    name={{
                      ios: "paperplane.fill",
                      android: "send",
                      web: "send",
                    }}
                    size={16}
                    tintColor="#FFFFFF"
                  />
                )}
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Popup xác nhận xóa bình luận */}
      <Modal
        visible={!!deleteConfirmCommentId}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmCommentId(null)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Xác nhận xóa</Text>
            <Text style={styles.popupSubtitle}>
              Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không
              thể hoàn tác.
            </Text>

            <View style={styles.popupActions}>
              <Pressable
                onPress={() => setDeleteConfirmCommentId(null)}
                style={({ pressed }) => [
                  styles.popupCancelBtn,
                  pressed && styles.pressed,
                ]}
                disabled={deletingComment}
              >
                <Text style={styles.popupCancelBtnText}>Hủy</Text>
              </Pressable>

              <Button
                title={deletingComment ? "Đang xóa..." : "Xóa"}
                onPress={handleConfirmDelete}
                disabled={deletingComment}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Alias export phòng trường hợp bạn import theo tên PostCommentsModal
export const PostCommentsModal = CommunityCommentsModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
  sheetContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: colors.surface || "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  dragHeaderArea: {
    paddingTop: 10,
    backgroundColor: colors.surface || "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border || "#E5E7EB",
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    bottom: 8,
    padding: 4,
  },
  pressed: {
    opacity: 0.65,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  commentRow: {
    gap: 8,
  },
  commentMain: {
    flexDirection: "row",
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    zIndex: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "center", // Canh icon 3 chấm ra giữa theo chiều dọc của bubble
    gap: 6, // Khoảng cách giữa bubble và icon 3 chấm
    paddingRight: 10, // Tránh icon sát mép màn hình bên phải
  },
  bubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    flexShrink: 1, // QUAN TRỌNG: Giúp text dài tự rớt dòng thay vì đẩy nút 3 chấm văng ra khỏi màn hình
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  mentionText: {
    fontWeight: "700",
    color: colors.primary || "#2563EB",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingLeft: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  repliesContainer: {
    paddingLeft: 18,
    position: "relative",
    marginTop: 8,
    gap: 12,
  },
  verticalThreadLine: {
    position: "absolute",
    left: 17,
    top: -4,
    bottom: 20,
    width: 2,
    backgroundColor: colors.border || "#E5E7EB",
  },
  replyWrapper: {
    position: "relative",
    paddingLeft: 20,
  },
  horizontalBranchLine: {
    position: "absolute",
    left: 0,
    top: 18,
    width: 18,
    height: 2,
    backgroundColor: colors.border || "#E5E7EB",
  },
  bannerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border || "#E5E7EB",
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border || "#E5E7EB",
    backgroundColor: colors.surface || "#FFFFFF",
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },

  /* Các Style cho Menu 3 chấm và Modal Popup */
  menuAnchor: {
    position: "relative",
    zIndex: 101,
  },
  iconBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  menuAnchorActive: {
    zIndex: 9999,
    elevation: 10,
  },
  dropdownBackdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "transparent",
  },
  dropdownMenu: {
    position: "absolute",
    top: 24,
    left: 0,
    minWidth: 140,
    backgroundColor: colors.surface || "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border || "#E5E7EB",
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  deleteOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popupContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.background || "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  popupSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  popupActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  popupCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  popupCancelBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
