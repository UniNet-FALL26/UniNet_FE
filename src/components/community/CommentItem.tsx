import { colors } from "@/constants/colors";
import { type CommentResponse } from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Image, Keyboard, Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface CommentItemProps {
  comment: CommentResponse;
  isReply?: boolean;
  optionsCommentId: string | null;
  setOptionsCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  onEdit: (comment: CommentResponse) => void;
  onDelete: (commentId: string) => void;
  onReport?: (comment: CommentResponse) => void;
  onReply: (
    commentId: string,
    authorName: string,
    authorUserId: string,
  ) => void;
}

export function CommentItem({
  comment,
  isReply = false,
  optionsCommentId,
  setOptionsCommentId,
  onEdit,
  onDelete,
  onReport,
  onReply,
}: CommentItemProps) {
  const { account } = useAuthStore();

  const isOwner =
    account?.id === comment.authorUserId ||
    (account as any)?.profile?.id === comment.authorUserId;
  const safeReplies = Array.isArray(comment.replies) ? comment.replies : [];

  // Ưu tiên hiển thị Nickname của tác giả bình luận
  const displayName =
    (comment as any)?.authorNickname ||
    (isOwner
      ? (account as any)?.profile?.nickname ||
        (account as any)?.profile?.fullName
      : null) ||
    comment.authorName;

  // Ưu tiên hiển thị Nickname của người được trả lời (fallback về Username/Name)
  const replyToName =
    (comment as any)?.replyToNickname ||
    (comment as any)?.replyToUserNickname ||
    (comment as any)?.replyToUserName ||
    comment.replyToUserName;

  const isThisCommentOpen = optionsCommentId === comment.id;
  const isTreeOpen =
    isThisCommentOpen || safeReplies.some((r) => r.id === optionsCommentId);

  return (
    <View
      style={[
        styles.commentRow,
        { overflow: "visible" },
        isTreeOpen && { zIndex: 9999, elevation: 10 },
        optionsCommentId === comment.id && { zIndex: 9999, elevation: 10 },
      ]}
    >
      <View
        style={[
          styles.commentMain,
          isThisCommentOpen && { zIndex: 9999, elevation: 10 },
        ]}
      >
        <View style={[styles.avatarPlaceholder, { overflow: "hidden" }]}>
          {comment.authorAvatarUrl ? (
            <Image
              source={{ uri: comment.authorAvatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {displayName?.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.commentBody}>
          <View
            style={[
              styles.bubbleRow,
              isThisCommentOpen && { zIndex: 9999, elevation: 10 },
              optionsCommentId === comment.id && {
                zIndex: 9999,
                elevation: 10,
              },
            ]}
          >
            <Pressable
              style={styles.bubble}
              onLongPress={() => { Keyboard.dismiss(); setOptionsCommentId(comment.id); }}
              delayLongPress={400}
              accessibilityHint={"Nhấn giữ để mở tùy chọn bình luận"}
              accessibilityActions={[{ name: 'longpress', label: 'Tùy chọn bình luận' }]}
              onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'longpress') { Keyboard.dismiss(); setOptionsCommentId(comment.id); } }}
            >
              <Text style={styles.authorName}>{displayName}</Text>
              <Text style={styles.commentContent}>
                {replyToName && (
                  <Text style={styles.mentionText}>@{replyToName} </Text>
                )}
                {comment.content}
              </Text>
            </Pressable>


          </View>
          <View style={styles.actionRow}>
            <Text style={styles.timeText}>
              {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
            </Text>
            <Pressable
              onPress={() =>
                onReply(comment.id, displayName, comment.authorUserId)
              }
            >
              <Text style={styles.replyBtnText}>Phản hồi</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {!isReply && safeReplies.length > 0 && (
        <View style={styles.repliesContainer}>
          <View style={styles.verticalThreadLine} />
          {safeReplies.map((reply, idx) => (
            <View
              key={reply.id || idx}
              style={[
                styles.replyWrapper,
                optionsCommentId === reply.id && {
                  zIndex: 9999,
                  elevation: 10,
                },
              ]}
            >
              <View style={styles.horizontalBranchLine} />
              <CommentItem
                comment={reply}
                isReply={true}
                optionsCommentId={optionsCommentId}
                setOptionsCommentId={setOptionsCommentId}
                onEdit={onEdit}
                onDelete={onDelete}
                onReport={onReport}
                onReply={onReply}
              />
            </View>
          ))}
        </View>
      )}
      {isThisCommentOpen && <Modal transparent visible animationType="fade" onRequestClose={() => setOptionsCommentId(null)}>
        <View style={styles.mobileMenuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng tùy chọn bình luận" onPress={() => setOptionsCommentId(null)} />
          <View style={styles.mobileMenu} accessibilityViewIsModal>
            <Text style={styles.mobileMenuTitle}>Bình luận của {displayName}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Phản hồi bình luận" style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={() => { setOptionsCommentId(null); onReply(comment.id, displayName, comment.authorUserId); }}>
              <SymbolView name={{ ios: 'arrowshape.turn.up.left', android: 'reply', web: 'reply' }} size={20} tintColor={colors.textPrimary} />
              <Text style={styles.optionText}>Phản hồi</Text>
            </Pressable>
            {isOwner && <>
              <Pressable accessibilityRole="button" accessibilityLabel="Sửa bình luận" style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={() => { setOptionsCommentId(null); onEdit(comment); }}>
                <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={20} tintColor={colors.textPrimary} />
                <Text style={styles.optionText}>Sửa bình luận</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Xóa bình luận" style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={() => { setOptionsCommentId(null); onDelete(comment.id); }}>
                <SymbolView name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={20} tintColor={colors.error} />
                <Text style={[styles.optionText, { color: colors.error }]}>Xóa bình luận</Text>
              </Pressable>
            </>}
            {!isOwner && onReport && <Pressable accessibilityRole="button" accessibilityLabel="Báo cáo bình luận" style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]} onPress={() => { setOptionsCommentId(null); onReport(comment); }}>
              <SymbolView name={{ ios: 'flag', android: 'outlined_flag', web: 'outlined_flag' }} size={20} tintColor={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>Báo cáo bình luận</Text>
            </Pressable>}
          </View>
        </View>
      </Modal>}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileMenuOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.45)' },
  mobileMenu: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: 16, padding: 8 },
  mobileMenuTitle: { color: colors.textSecondary, fontSize: 13, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 4 },
  commentRow: { gap: 8 },
  commentMain: { flexDirection: "row", gap: 10 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  commentBody: { flex: 1, gap: 4 },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 10,
  },
  bubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    flexShrink: 1,
  },
  authorName: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  mentionText: { fontWeight: "700", color: colors.primary },
  actionRow: { flexDirection: "row", gap: 14, paddingLeft: 4 },
  timeText: { fontSize: 12, color: colors.textSecondary },
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
    backgroundColor: "#E5E7EB",
  },
  replyWrapper: { position: "relative", paddingLeft: 20 },
  horizontalBranchLine: {
    position: "absolute",
    left: 0,
    top: 18,
    width: 18,
    height: 2,
    backgroundColor: "#E5E7EB",
  },
  menuAnchor: { position: "relative" },
  dropdownBackdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "transparent",
  },
  dropdownContainer: { position: "absolute", top: 32, left: 0, zIndex: 1000 },
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dropdownItemPressed: {
    borderColor: colors.primary,
    backgroundColor: "#F3F4F6",
  },
  optionText: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
});
