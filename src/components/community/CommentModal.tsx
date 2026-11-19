import { colors } from "@/constants/colors";
import {
  communityService,
  type CommentResponse,
  type PostResponse,
} from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  useWindowDimensions,
} from "react-native";
import { CommentItem } from "./CommentItem";

interface CommentModalProps {
  post: PostResponse | null;
  onClose: () => void;
  onToggleReaction: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onRequestEdit: (post: PostResponse) => void;
  onRequestDelete: (postId: string) => void;
  onCommentCountChange: (postId: string, delta: number) => void; // Thêm dòng này
}
export function CommentModal({
  post,
  onClose,
  onToggleReaction,
  onToggleBookmark,
  onRequestEdit,
  onRequestDelete,
  onCommentCountChange,
}: CommentModalProps) {
  const { account } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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

  // Dùng cho slider ảnh bên trái
  const [mediaIndex, setMediaIndex] = useState(0);

  const abortController = useRef<AbortController | null>(null);
  const textInputRef = useRef<TextInput>(null);

  const isPostOwner =
    account?.id === post?.authorUserId ||
    (account as any)?.profile?.id === post?.authorUserId;
  const isFavorited = (post as any)?.isFavorited;
  const isSaved = (post as any)?.isSaved;

  useEffect(() => {
    if (!post?.id) {
      setComments([]);
      setMediaIndex(0);
      setOptionsPostOpen(false);
      return;
    }

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const fetchCommentsData = async () => {
      setLoading(true);
      setError("");
      try {
        if (!post.id.startsWith("temp-")) {
          const commentsData = await communityService.getComments(
            post.id,
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
    return () => controller.abort();
  }, [post?.id]);

  // Giữ nguyên logic xử lý Comment & Reply cũ
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
    if (!text || sending || !post?.id) return;
    setSending(true);

    try {
      if (editingComment) {
        await communityService.updateComment(editingComment.id, {
          content: text,
        });
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
        onCommentCountChange(post.id, 1); // <--- THÊM DÒNG NÀY ĐỂ ĐỒNG BỘ
        setReplyingTo(null);

        // Tìm đoạn code gửi Comment gốc:
      } else {
        const res = await communityService.createComment(post.id, {
          content: text,
        });
        const rawComment = (res as any)?.data ?? res;
        setComments((prev) => [
          { ...rawComment, content: text, replies: [] },
          ...prev,
        ]);
        onCommentCountChange(post.id, 1); // <--- THÊM DÒNG NÀY ĐỂ ĐỒNG BỘ
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
    textInputRef.current?.focus();
  };

  const handleReplyComment = (
    commentId: string,
    authorName: string,
    authorUserId: string,
  ) => {
    setEditingComment(null);
    setReplyingTo({ commentId, authorName, authorUserId });
    textInputRef.current?.focus();
  };

  if (!post) return null;

  const displayName = (post as any).authorNickname || post.authorName;
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;

  return (
    <>
      <Modal
        visible={!!post}
        transparent
        animationType={isDesktop ? "fade" : "slide"}
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, !isDesktop && styles.mobileModalContainer]}>
          {!isDesktop && <Pressable accessibilityRole="button" accessibilityLabel="Đóng bình luận" onPress={onClose} style={StyleSheet.absoluteFill} />}
          {/* Đưa nút X ra ngoài cùng của màn hình */}
          {isDesktop && <Pressable accessibilityRole="button" accessibilityLabel="Đóng bình luận" style={styles.globalCloseBtn} onPress={onClose}>
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={24}
              tintColor="#FFF"
            />
          </Pressable>}

          <KeyboardAvoidingView
            testID={!isDesktop ? "community-comments-sheet" : undefined}
            accessibilityViewIsModal
            role="dialog"
            aria-label="Bình luận"
            aria-modal
            style={[
              isDesktop ? styles.contentWrapper : styles.mobileSheet,
              { flexDirection: isDesktop ? "row" : "column" },
            ]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* CỘT TRÁI: Media Viewer */}
            {isDesktop && <View
              style={[
                styles.leftMediaSection,
                !hasMedia && { display: "none" },
              ]}
            >
              {hasMedia && (
                <View testID="community-comment-media" style={styles.imageViewer}>
                  <Image
                    source={{ uri: post.mediaUrls[mediaIndex] }}
                    style={styles.imageBackdrop}
                    resizeMode="cover"
                    blurRadius={24}
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  {post.mediaUrls.length > 1 && (
                    <Pressable
                      style={[styles.navArrow, { left: 20 }]}
                      onPress={() =>
                        setMediaIndex((prev) =>
                          prev > 0 ? prev - 1 : post.mediaUrls.length - 1,
                        )
                      }
                    >
                      <SymbolView
                        name={{
                          ios: "chevron.left",
                          android: "chevron_left",
                          web: "chevron_left",
                        }}
                        size={32}
                        tintColor="#FFF"
                      />
                    </Pressable>
                  )}

                  <Image
                    source={{ uri: post.mediaUrls[mediaIndex] }}
                    style={styles.mainImage}
                    resizeMode="contain"
                  />

                  {post.mediaUrls.length > 1 && (
                    <Pressable
                      style={[styles.navArrow, { right: 20 }]}
                      onPress={() =>
                        setMediaIndex((prev) =>
                          prev < post.mediaUrls.length - 1 ? prev + 1 : 0,
                        )
                      }
                    >
                      <SymbolView
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                          web: "chevron_right",
                        }}
                        size={32}
                        tintColor="#FFF"
                      />
                    </Pressable>
                  )}
                </View>
              )}
            </View>}

            {/* CỘT PHẢI: Thông tin bài viết, Menu Post, Comment */}
            <View
              style={[
                styles.rightDetailSection,
                (!hasMedia || !isDesktop) && { flex: 1 },
              ]}
            >
              {!isDesktop && <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetTitleRow}>
                  <Text accessibilityRole="header" style={styles.sheetTitle}>Bình luận</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Đóng bình luận" onPress={onClose} style={styles.sheetClose}>
                    <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={21} tintColor={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>}
              {/* Header của bài viết (bên phải) */}
              {isDesktop && <View
                style={[
                  styles.rightHeader,
                  optionsPostOpen && { zIndex: 9999 },
                ]}
              >
                <View style={styles.authorInfoRow}>
                  <View style={styles.avatarPlaceholder}>
                    {post.authorAvatar ? (
                      <Image
                        source={{ uri: post.authorAvatar }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {displayName?.charAt(0)?.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.authorNameText}>{displayName}</Text>
                    <Text style={styles.dateText}>
                      {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </Text>
                  </View>
                </View>

                {/* Dấu 3 chấm chức năng của Post */}
                <View style={{ position: "relative", zIndex: 9999 }}>
                  <Pressable
                    onPress={() => setOptionsPostOpen(!optionsPostOpen)}
                    style={{ padding: 8 }}
                  >
                    <SymbolView
                      name={{
                        ios: "ellipsis",
                        android: "more_horiz",
                        web: "more_horiz",
                      }}
                      size={24}
                      tintColor={colors.textSecondary}
                    />
                  </Pressable>

                  {optionsPostOpen && (
                    <>
                      <Pressable
                        style={styles.dropdownBackdrop}
                        onPress={() => setOptionsPostOpen(false)}
                      />
                      <View style={styles.postDropdownMenu}>
                        <Pressable
                          onPress={() => {
                            setOptionsPostOpen(false);
                            onToggleBookmark(post.id);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text style={styles.optionText}>
                            {isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
                          </Text>
                        </Pressable>

                        {isPostOwner && (
                          <>
                            <Pressable
                              onPress={() => {
                                setOptionsPostOpen(false);
                                onRequestEdit(post);
                              }}
                              style={styles.dropdownItem}
                            >
                              <Text style={styles.optionText}>
                                Sửa bài viết
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setOptionsPostOpen(false);
                                onRequestDelete(post.id);
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
                          </>
                        )}
                      </View>
                    </>
                  )}
                </View>
              </View>}

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={{ padding: 16, paddingBottom: isDesktop ? 150 : 24 }}
                keyboardShouldPersistTaps="handled"
                onScroll={() => {
                  if (optionsPostOpen) setOptionsPostOpen(false);
                  if (optionsCommentId) setOptionsCommentId(null);
                }}
              >
                {/* Description */}
                {isDesktop && post.description ? (
                  <Text style={styles.postDescriptionText}>
                    {post.description}
                  </Text>
                ) : null}

                {/* React & Comment Count Bar */}
                {isDesktop && <View style={styles.statsBar}>
                  <Pressable
                    style={styles.statBtn}
                    onPress={() => onToggleReaction(post.id)}
                  >
                    <SymbolView
                      name={{
                        ios: isFavorited ? "heart.fill" : "heart",
                        android: isFavorited ? "favorite" : "favorite_border",
                        web: isFavorited ? "favorite" : "favorite_border",
                      }}
                      size={20}
                      tintColor={isFavorited ? "#EF4444" : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.statText,
                        isFavorited && { color: "#EF4444", fontWeight: "600" },
                      ]}
                    >
                      {post.favoriteCount}
                    </Text>
                  </Pressable>
                  <View style={styles.statBtn}>
                    <SymbolView
                      name={{
                        ios: "bubble.right.fill",
                        android: "comment",
                        web: "comment",
                      }}
                      size={20}
                      tintColor={colors.textSecondary}
                    />
                    <Text style={styles.statText}>{post.commentCount}</Text>
                  </View>
                </View>}

                {/* Comment List */}
                {loading ? (
                  <ActivityIndicator
                    style={{ marginTop: 40 }}
                    size="large"
                    color={colors.primary}
                  />
                ) : error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : comments.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                  </Text>
                ) : (
                  <View style={{ gap: 16, marginTop: 16 }}>
                    {comments.map((comment, index) => {
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
                            onDelete={(id) => setDeleteConfirmCommentId(id)}
                            onReply={handleReplyComment}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* Input section (Giữ nguyên logic cũ) */}
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
                  accessibilityLabel="Viết bình luận"
                  style={styles.input}
                  placeholder="Viết bình luận..."
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  editable={!sending}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gửi bình luận"
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
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal xác nhận xóa Comment */}
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
                  if (deleteConfirmCommentId && post?.id) {
                    await communityService.deleteComment(
                      deleteConfirmCommentId,
                    );
                    setComments((prev) =>
                      removeCommentFromTree(prev, deleteConfirmCommentId),
                    );

                    onCommentCountChange(post.id, -1); // <--- THÊM DÒNG NÀY ĐỂ ĐỒNG BỘ

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
  mobileModalContainer: { justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  mobileSheet: { width: '100%', alignSelf: 'center', flexShrink: 0, height: '78%', maxHeight: '90%', maxWidth: 700, backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  sheetHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB', paddingTop: 9, paddingHorizontal: 16 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#D3DAE5' },
  sheetTitleRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)", // Nền tối ngoài cùng
  },
  contentWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  leftMediaSection: {
    flex: 1.5,
    backgroundColor: "#000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  globalCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    zIndex: 9999, // Đảm bảo luôn nằm trên cùng mọi thành phần
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 24,
  },
  imageViewer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageBackdrop: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.15 }],
    pointerEvents: "none",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  rightDetailSection: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: Platform.OS !== "web" ? 16 : 0,
    borderTopRightRadius: Platform.OS !== "web" ? 16 : 0,
    overflow: "hidden",
  },
  rightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  authorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  authorNameText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dateText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  dropdownBackdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  postDropdownMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 160,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  optionText: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },

  scrollArea: { flex: 1 },
  postDescriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1F2937",
    marginBottom: 16,
  },
  statsBar: {
    flexDirection: "row",
    gap: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  statBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },

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
    borderTopWidth: 1,
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
