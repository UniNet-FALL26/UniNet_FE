import { colors } from "@/constants/colors";
import {
  communityService,
  type PostResponse,
} from "@/services/community.service";
import { pickProfileImage } from "@/utils/profile-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
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
} from "react-native";

interface UpdatePostModalProps {
  post: PostResponse | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: (updatedPost: PostResponse) => void;
}

export function UpdatePostModal({
  post,
  visible,
  onClose,
  onUpdated,
}: UpdatePostModalProps) {
  const [description, setDescription] = useState("");
  // Danh sách ảnh cũ (đang là URL string) và ảnh mới (dạng object asset từ trình chọn ảnh)
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<any[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (post) {
      setDescription(post.description || "");
      setExistingMedia(post.mediaUrls || []);
      setNewFiles([]);
      setError("");
    }
  }, [post]);

  async function attachNewImage() {
    setError("");
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
      setNewFiles((prev) => [...prev, asset]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể chọn ảnh. Vui lòng thử lại.",
      );
    }
  }

  function removeExistingMedia(index: number) {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpdate() {
    if (!post || busy) return;
    if (
      !description.trim() &&
      existingMedia.length === 0 &&
      newFiles.length === 0
    ) {
      setError("Bài viết phải có nội dung hoặc ít nhất một hình ảnh.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("description", description.trim());

      // KHỚP VỚI API MỚI: Dùng keepMediaUrls
      existingMedia.forEach((url, index) => {
        formData.append(`keepMediaUrls[${index}]`, url);
      });

      // KHỚP VỚI API MỚI: Dùng newFiles
      newFiles.forEach((file) => {
        if (Platform.OS === "web" && file.file) {
          formData.append("newFiles", file.file);
        } else {
          formData.append("newFiles", {
            uri: file.uri,
            name:
              file.fileName ||
              file.uri.split("/").pop() ||
              `upload_${Date.now()}.jpg`,
            type: file.mimeType || "image/jpeg",
          } as any);
        }
      });

      const res = await communityService.updatePost(post.id, formData as any);
      const updatedPost = (res as any)?.data ?? res;

      // Cập nhật lại UI sau khi Backend trả về thành công
      onUpdated({
        ...post,
        ...(typeof updatedPost === "object" ? updatedPost : {}),
        description: updatedPost?.description || description.trim(),
        mediaUrls:
          updatedPost?.mediaUrls && updatedPost.mediaUrls.length > 0
            ? updatedPost.mediaUrls
            : [...existingMedia, ...newFiles.map((f) => f.uri)],
      });

      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể cập nhật bài viết. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View style={{ width: 36 }} />
            <Text style={styles.title}>Chỉnh sửa bài viết</Text>
            <Pressable
              disabled={busy}
              onPress={onClose}
              style={styles.closeBtn}
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
            contentContainerStyle={styles.dialogContent}
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              multiline
              placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?"
              value={description}
              onChangeText={setDescription}
              editable={!busy}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            {/* Khu vực hiển thị ảnh cũ & ảnh mới */}
            {(existingMedia.length > 0 || newFiles.length > 0) && (
              <View style={styles.previewContainer}>
                <View style={styles.previewGrid}>
                  {/* Hiển thị ảnh cũ */}
                  {existingMedia.map((url, index) => (
                    <View key={`old-${index}`} style={styles.previewItem}>
                      <Image
                        source={{ uri: url }}
                        style={styles.previewImage}
                      />
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeExistingMedia(index)}
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

                  {/* Hiển thị ảnh mới chọn */}
                  {newFiles.map((file, index) => (
                    <View key={`new-${index}`} style={styles.previewItem}>
                      <Image
                        source={{ uri: file.uri }}
                        style={styles.previewImage}
                      />
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeNewFile(index)}
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
              style={styles.attachMediaBar}
              onPress={() => void attachNewImage()}
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
              <Text style={styles.attachMediaText}>Thêm ảnh hoặc video</Text>
            </Pressable>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[
                styles.publishButton,
                busy && styles.publishButtonDisabled,
              ]}
              onPress={() => void handleUpdate()}
              disabled={busy}
            >
              <Text style={styles.publishButtonText}>
                {busy ? "Đang lưu..." : "Lưu thay đổi"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  input: {
    minHeight: 130,
    fontSize: 16,
    lineHeight: 24,
    color: "#1F2937",
    textAlignVertical: "top",
    paddingTop: 4,
  },
  previewContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewItem: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  previewImage: { width: "100%", height: "100%" },
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
  attachMediaText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  error: { fontSize: 13, color: colors.error, textAlign: "center" },
  publishButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  publishButtonDisabled: { backgroundColor: "#E5E7EB" },
  publishButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
