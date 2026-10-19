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

  const handleDelete = async (commentId: string) => {
    try {
      await communityService.deleteComment(commentId);
      setComments((prev) => removeCommentFromTree(prev, commentId));
      onCommentCountChange?.(-1);
    } catch {
      // Ignored
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
    const isOwner = account?.id === comment.authorUserId;
    const safeReplies = Array.isArray(comment.replies) ? comment.replies : [];
    const hasReplies = !isReply && safeReplies.length > 0;

    const replyToName = (comment as any)?.replyToUserName;

    return (
      <View style={styles.commentRow}>
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
            <View style={styles.bubble}>
              <Text style={styles.authorName}>{comment.authorName}</Text>
              <Text style={styles.commentContent}>
                {replyToName && (
                  <Text style={styles.mentionText}>@{replyToName} </Text>
                )}
                {comment.content}
              </Text>
            </View>

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

              {isOwner && (
                <>
                  <Pressable
                    onPress={() => startEdit(comment)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Text style={styles.editBtnText}>Sửa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(comment.id)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteBtnText}>Xóa</Text>
                  </Pressable>
                </>
              )}
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
                style={styles.replyWrapper}
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
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Khối Bottom Sheet */}
        <Animated.View style={[styles.sheetContainer, { height: sheetHeight }]}>
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
            >
              {comments.map((comment, index) => (
                <View
                  key={comment.id || `comment-${index}-${comment.createdAt}`}
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
  bubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
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
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
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
});
