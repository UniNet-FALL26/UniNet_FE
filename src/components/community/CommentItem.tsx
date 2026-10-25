import { colors } from "@/constants/colors";
import { type CommentResponse } from "@/services/community.service";
import { useAuthStore } from "@/store/auth.store";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CommentItemProps {
  comment: CommentResponse;
  isReply?: boolean;
  optionsCommentId: string | null;
  setOptionsCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  onEdit: (comment: CommentResponse) => void;
  onDelete: (commentId: string) => void;
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
  onReply,
}: CommentItemProps) {
  const { account } = useAuthStore();

  const isOwner =
    account?.id === comment.authorUserId ||
    (account as any)?.profile?.id === comment.authorUserId;
  const safeReplies = Array.isArray(comment.replies) ? comment.replies : [];
  const replyToName = (comment as any)?.replyToUserName;

  // Thêm 2 dòng này để xác định trạng thái mở dropdown
  const isThisCommentOpen = optionsCommentId === comment.id;
  const isTreeOpen =
    isThisCommentOpen || safeReplies.some((r) => r.id === optionsCommentId);

  return (
    <View
      style={[
        styles.commentRow,
        // 1. Nâng toàn bộ cụm bình luận (bao gồm cả con) lên nếu có bất kỳ menu nào đang mở
        isTreeOpen && { zIndex: 9999, elevation: 10 },
        optionsCommentId === comment.id && { zIndex: 9999, elevation: 10 },
      ]}
    >
      <View
        style={[
          styles.commentMain,
          // 2. Nâng riêng phần nội dung chính lên trên cụm repliesContainer nếu menu của nó đang mở
          isThisCommentOpen && { zIndex: 9999, elevation: 10 },
        ]}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {comment.authorName?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.commentBody}>
          <View
            style={[
              styles.bubbleRow,
              // 3. Nâng tiếp commentBody lên
              isThisCommentOpen && { zIndex: 9999, elevation: 10 },
              optionsCommentId === comment.id && {
                zIndex: 9999,
                elevation: 10,
              },
            ]}
          >
            <View style={styles.bubble}>
              <Text style={styles.authorName}>{comment.authorName}</Text>
              <Text style={styles.commentContent}>
                {replyToName && (
                  <Text style={styles.mentionText}>@{replyToName} </Text>
                )}
                {comment.content}
              </Text>
            </View>

            {isOwner && (
              <View
                style={[
                  styles.menuAnchor,
                  optionsCommentId === comment.id && {
                    zIndex: 9999,
                    elevation: 10,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    setOptionsCommentId((prev) =>
                      prev === comment.id ? null : comment.id,
                    )
                  }
                  style={styles.iconBtnSmall}
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

                {optionsCommentId === comment.id && (
                  <>
                    <Pressable
                      style={styles.dropdownBackdrop}
                      onPress={() => setOptionsCommentId(null)}
                    />
                    <View style={styles.dropdownContainer}>
                      <View style={styles.tooltipArrow} />
                      <View style={styles.dropdownMenu}>
                        <Pressable
                          onPress={() => {
                            setOptionsCommentId(null);
                            onEdit(comment);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            pressed && styles.dropdownItemPressed,
                          ]}
                        >
                          <Text style={styles.optionText}>Sửa bình luận</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setOptionsCommentId(null);
                            onDelete(comment.id);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            pressed && styles.dropdownItemPressed,
                          ]}
                        >
                          <Text
                            style={[styles.optionText, { color: colors.error }]}
                          >
                            Xóa bình luận
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
          <View style={styles.actionRow}>
            <Text style={styles.timeText}>
              {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
            </Text>
            <Pressable
              onPress={() =>
                onReply(comment.id, comment.authorName, comment.authorUserId)
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
                onReply={onReply}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
