import { colors } from "@/constants/colors";
import { communityService } from "@/services/community.service";
import { portfolioService } from "@/services/portfolio.service";
import { useAuthStore } from "@/store/auth.store";
import { pickProfileImage } from "@/utils/profile-image-picker";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
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

export function CommunityComposer({ onCreated }: { onCreated: () => void }) {
  const { account } = useAuthStore();
  const { width } = useWindowDimensions();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const controller = useRef<AbortController | null>(null);
  const input = useRef<TextInput>(null);

  // Lấy tên người dùng để hiển thị chữ cái đầu nếu không có avatar
  const authorName =
    account?.profile?.fullName ||
    (account as any)?.profile?.fullName ||
    account?.email ||
    "U";
  const firstLetter = authorName.charAt(0).toUpperCase();

  useEffect(() => {
    const request = new AbortController();
    setAvatar(null);
    if (account?.id)
      portfolioService
        .getMine(request.signal)
        .then((data) => {
          if (!request.signal.aborted && data.isOwner) {
            const url = data.profile.avatarUrl;
            // Bỏ qua nếu URL bị backend trả về chữ "string" mặc định của Swagger
            setAvatar(url && url !== "string" ? url : null);
          }
        })
        .catch(() => {});
    return () => {
      request.abort();
      controller.current?.abort();
    };
  }, [account?.id]);

  function close() {
    if (!busy) {
      setOpen(false);
      setError("");
    }
  }

  function start() {
    setNotice("");
    setError("");
    setOpen(true);
  }

  async function attach() {
    setError("");
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
      setSelectedFiles((prev) => [...prev, asset]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chưa tải được tệp. Vui lòng thử lại.",
      );
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function publish() {
    if (busy || (!description.trim() && selectedFiles.length === 0)) return;

    setBusy(true);
    setError("");
    controller.current = new AbortController();

    try {
      const formData = new FormData();

      if (description.trim()) {
        formData.append("description", description.trim());
      }

      selectedFiles.forEach((file) => {
        if (Platform.OS === "web" && file.file) {
          formData.append("files", file.file);
        } else {
          formData.append("files", {
            uri: file.uri,
            name:
              file.fileName ||
              file.uri.split("/").pop() ||
              `upload_${Date.now()}.jpg`,
            type: file.mimeType || "image/jpeg",
          } as any);
        }
      });

      // 1. Chỉ cần đợi API gọi thành công
      await communityService.createPost(formData, controller.current.signal);

      // 2. Kích hoạt hàm báo hiệu ra bên ngoài để tải lại Feed
      onCreated();

      // 3. Reset form và đóng modal
      setDescription("");
      setSelectedFiles([]);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chưa đăng được bài. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  const actions = [
    {
      label: "Ảnh/Video",
      icon: { ios: "photo.fill", android: "image", web: "image" },
      tint: "#10B981",
      bgColor: "#ECFDF5",
      onPress: attach,
    },
    {
      label: "Tài liệu",
      icon: {
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      },
      tint: "#3B82F6",
      bgColor: "#EFF6FF",
      onPress: () => router.push("/(tabs)/documents"),
    },
    {
      label: "Khảo sát",
      icon: { ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" },
      tint: "#F59E0B",
      bgColor: "#FEF3C7",
      onPress: () => setNotice("Tính năng tạo khảo sát sẽ sớm có mặt."),
    },
    {
      label: "Sự kiện",
      icon: { ios: "calendar", android: "event", web: "event" },
      tint: "#8B5CF6",
      bgColor: "#F5F3FF",
      onPress: () => router.push("/(tabs)/events"),
    },
  ] as const;

  return (
    <View
      testID="community-composer"
      style={[s.card, Platform.OS === "web" && width >= 1024 && s.desktopCard]}
    >
      <View style={s.row}>
        {/* Avatar bên ngoài Feed */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở hồ sơ cá nhân"
          onPress={() => router.navigate("/(tabs)/profile")}
          style={s.avatarPlaceholder}
        >
          {avatar ? (
            <Image
              accessibilityLabel="Ảnh đại diện của bạn"
              source={{ uri: avatar }}
              onError={() => setAvatar(null)}
              style={s.avatarImage}
            />
          ) : (
            <Text style={s.avatarText}>{firstLetter}</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tạo bài viết mới"
          onPress={start}
          style={({ pressed }) => [s.prompt, pressed && s.pressed]}
        >
          <Text numberOfLines={1} style={s.placeholder}>
            Bạn đang nghĩ gì? Chia sẻ với cộng đồng UniNet...
          </Text>
        </Pressable>
      </View>

      <View style={s.dividerLine} />

      <View style={s.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [s.actionBtnItem, pressed && s.pressed]}
          >
            <View
              style={[s.actionIconBadge, { backgroundColor: action.bgColor }]}
            >
              <SymbolView
                name={action.icon}
                size={width < 380 ? 16 : 19}
                tintColor={action.tint}
              />
            </View>
            <Text style={[s.label, width < 380 && s.smallLabel]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      )}

      {/* Modal Tạo Bài Viết */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        onShow={() => input.current?.focus()}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View accessibilityViewIsModal style={s.dialog}>
            <View style={s.dialogHeader}>
              <View style={{ width: 36 }} />
              <Text role="heading" aria-level={2} style={s.title}>
                Tạo bài viết
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng trình soạn bài"
                disabled={busy}
                onPress={close}
                style={s.closeBtn}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={18}
                  tintColor="#4B5563"
                />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.dialogContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Thông tin tác giả bên trong Modal */}
              <View style={s.modalAuthorRow}>
                <View style={s.avatarPlaceholder}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={s.avatarImage} />
                  ) : (
                    <Text style={s.avatarText}>{firstLetter}</Text>
                  )}
                </View>
                <Text style={s.modalAuthorName}>{authorName}</Text>
              </View>

              <TextInput
                ref={input}
                accessibilityLabel="Nội dung bài viết"
                multiline
                placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?"
                value={description}
                onChangeText={setDescription}
                editable={!busy}
                style={s.input}
                placeholderTextColor="#9CA3AF"
              />

              {/* Khu vực preview ảnh/video dạng lưới tự xuống dòng */}
              {selectedFiles.length > 0 && (
                <View style={s.previewContainer}>
                  <View style={s.previewGrid}>
                    {selectedFiles.map((file, index) => (
                      <View key={index} style={s.previewItem}>
                        <Image
                          source={{ uri: file.uri }}
                          resizeMode="cover"
                          style={s.previewImage}
                        />
                        <Pressable
                          style={s.removeBtn}
                          onPress={() => removeFile(index)}
                          disabled={busy}
                        >
                          <SymbolView
                            name={{
                              ios: "xmark",
                              android: "close",
                              web: "close",
                            }}
                            size={14}
                            tintColor="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Pressable
                style={s.attachMediaBar}
                onPress={() => void attach()}
                disabled={busy}
              >
                <SymbolView
                  name={{
                    ios: "photo.badge.plus",
                    android: "add_photo_alternate",
                    web: "add_photo_alternate",
                  }}
                  size={22}
                  tintColor={colors.primary}
                />
                <Text style={s.attachMediaText}>Thêm ảnh hoặc video</Text>
              </Pressable>

              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}

              <Pressable
                style={[
                  s.publishButton,
                  (!description.trim() && selectedFiles.length === 0) || busy
                    ? s.publishButtonDisabled
                    : null,
                ]}
                onPress={() => void publish()}
                disabled={
                  (!description.trim() && selectedFiles.length === 0) || busy
                }
              >
                <Text style={s.publishButtonText}>
                  {busy ? "Đang đăng..." : "Đăng bài viết"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  desktopCard: { marginTop: 0 },
  card: {
    width: "100%",
    maxWidth: 768,
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },

  // Style Avatar đồng bộ PostDetailModal
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  prompt: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  placeholder: { color: "#6B7280", fontSize: 14, fontWeight: "500" },

  dividerLine: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actionBtnItem: {
    flex: 1,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 4,
  },
  actionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  smallLabel: { fontSize: 11 },
  pressed: { opacity: 0.7 },
  notice: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  // Modal Styling
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: { color: "#1F2937", fontSize: 18, fontWeight: "700" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogContent: { padding: 20, gap: 16 },

  modalAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalAuthorName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  input: {
    minHeight: 130,
    fontSize: 16,
    lineHeight: 24,
    color: "#1F2937",
    textAlignVertical: "top",
    paddingTop: 4,
    // Thêm 2 dòng này để triệt tiêu hoàn toàn viền focus mặc định trên Web/Mobile
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },

  previewContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewItem: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  attachMediaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
  },
  attachMediaText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },

  error: { fontSize: 13, color: colors.error, textAlign: "center" },

  publishButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  publishButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  publishButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
