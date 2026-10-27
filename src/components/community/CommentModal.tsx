import { colors } from "@/constants/colors";
import {
  communityService,
  type CommentResponse,
} from "@/services/community.service";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
} from "react-native";
import { CommentItem } from "./CommentItem";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const HEIGHT_CLOSED = 0;
const HEIGHT_MID = SCREEN_HEIGHT * 0.55;
const HEIGHT_FULL = SCREEN_HEIGHT * 0.92;

interface CommentModalProps {
  postId: string | null;
  onClose: () => void;
}

export function CommentModal({ postId, onClose }: CommentModalProps) {
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
  const [deleteConfirmCommentId, setDeleteConfirmCommentId] = useState<
    string | null
  >(null);

  const abortController = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const sheetHeight = useRef(new Animated.Value(HEIGHT_CLOSED)).current;
  const currentHeight = useRef(HEIGHT_CLOSED);
  const backdropOpacity = sheetHeight.interpolate({
    inputRange: [HEIGHT_CLOSED, HEIGHT_MID],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const animateToHeight = useCallback(
    (toValue: number, onComplete?: () => void) => {
      Animated.spring(sheetHeight, {
        toValue,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start(() => {
        currentHeight.current = toValue;
        if (onComplete) onComplete();
      });
    },
    [sheetHeight],
  );

  const handleDismiss = useCallback(() => {
    animateToHeight(HEIGHT_CLOSED, () => {
      onClose();
    });
  }, [animateToHeight, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (e, gestureState) => {
        const newHeight = Math.max(0, currentHeight.current - gestureState.dy);
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (e, gestureState) => {
        const finalHeight = currentHeight.current - gestureState.dy;
        if (gestureState.vy > 1.5 || finalHeight < HEIGHT_MID - 100) {
          handleDismiss();
        } else if (finalHeight < (HEIGHT_MID + HEIGHT_FULL) / 2) {
          animateToHeight(HEIGHT_MID);
        } else {
          animateToHeight(HEIGHT_FULL);
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (!postId) {
      setComments([]);
      animateToHeight(HEIGHT_CLOSED);
      return;
    }

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const fetchCommentsData = async () => {
      setLoading(true);
      setError("");

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
        if (!controller.signal.aborted) {
          console.error("Lỗi lấy bình luận:", cause);
          setComments([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCommentsData();
    requestAnimationFrame(() => animateToHeight(HEIGHT_MID));

    return () => controller.abort();
  }, [postId, animateToHeight]);

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
    if (!text || sending || !postId) return;
    setSending(true);

    try {
      if (editingComment) {
        await communityService.updateComment(editingComment.id, {
          content: text,
        });
        // GIẢI PHÁP: Giữ lại toàn bộ data cũ của comment (...c) (name, avatar), chỉ ghi đè content vừa nhập
        setComments((prev) =>
          prev.map((c) =>
            c.id === editingComment.id ? { ...c, content: text } : c,
          ),
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
        const res = await communityService.createComment(postId, {
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
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismiss}
            />
          </Animated.View>

          <Animated.View
            style={[styles.sheetContainer, { height: sheetHeight }]}
          >
            <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Bình luận</Text>
                {Platform.OS === "web" && (
                  <Pressable onPress={handleDismiss} style={styles.closeBtn}>
                    <SymbolView
                      name={{ web: "close" }}
                      size={20}
                      tintColor={colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {loading ? (
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
                onScroll={() => setOptionsCommentId(null)}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.commentsSection}>
                  {comments.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Chưa có bình luận nào. Hãy là người đầu tiên!
                    </Text>
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
      <Modal
        visible={!!deleteConfirmCommentId}
        transparent
        animationType="fade"
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Xóa bình luận?</Text>
            <Text style={styles.popupMessage}>
              Bình luận này sẽ bị xóa vĩnh viễn.
            </Text>
            <View style={styles.popupActions}>
              <Pressable
                style={[styles.popupBtn, { backgroundColor: "#F3F4F6" }]}
                onPress={() => setDeleteConfirmCommentId(null)}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                style={[styles.popupBtn, { backgroundColor: colors.error }]}
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
              >
                <Text
                  style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}
                >
                  Xóa
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    overflow: "hidden",
  },
  dragHeaderArea: {
    paddingTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
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
  commentsSection: { padding: 16, gap: 16 },
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
    alignItems: "center",
    padding: 20,
  },
  popupContent: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  popupMessage: { fontSize: 14, color: colors.textSecondary, marginBottom: 18 },
  popupActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  popupBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
