import { colors } from "@/constants/colors";
import { SymbolView } from "expo-symbols";
import {
    Image,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

// Định nghĩa đúng kiểu dữ liệu trả về từ API Quảng Cáo
export interface AdResponse {
  id: string;
  companyUserId: string;
  companyName: string;
  packageId: string;
  packageName: string;
  title: string;
  content: string;
  destinationUrl: string;
  mediaUrl: string;
  status: number;
  budgetCap: number;
  impressionCount: number;
  clickCount: number;
  startedAt: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AdPostCardProps {
  ad: AdResponse;
}

export function AdPostCard({ ad }: AdPostCardProps) {
  const handleOpenAd = async () => {
    try {
      if (ad.destinationUrl) {
        await Linking.openURL(ad.destinationUrl);
      }
    } catch (error) {
      console.error("Không thể mở đường dẫn quảng cáo:", error);
    }
  };

  return (
    <Pressable style={styles.card} onPress={handleOpenAd}>
      {/* Header: Logo và tên công ty */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={styles.avatarPlaceholder}>
            <SymbolView
              name={{
                ios: "megaphone.fill",
                android: "campaign",
                web: "campaign",
              }}
              size={20}
              tintColor={colors.primary}
            />
          </View>
          <View>
            <Text style={styles.companyName}>{ad.companyName}</Text>
            <Text style={styles.sponsoredText}>Được tài trợ</Text>
          </View>
        </View>
      </View>

      {/* Nội dung quảng cáo */}
      <View style={styles.contentWrapper}>
        {ad.title ? <Text style={styles.adTitle}>{ad.title}</Text> : null}
        <Text style={styles.description} numberOfLines={3}>
          {ad.content}
        </Text>
      </View>

      {/* Ảnh/Video Banner */}
      {ad.mediaUrl ? (
        <Image
          source={{ uri: ad.mediaUrl }}
          style={styles.coverMedia}
          resizeMode="cover"
        />
      ) : null}

      {/* Call to action (Nút điều hướng) */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaTextContainer}>
          <Text style={styles.ctaTitle}>Tìm hiểu thêm</Text>
          <Text style={styles.ctaSubtitle}>Nhấn để xem chi tiết</Text>
        </View>
        <View style={styles.ctaAction}>
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={24}
            tintColor={colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorInfo: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sponsoredText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contentWrapper: {
    gap: 4,
  },
  adTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  coverMedia: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  ctaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ctaAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight || "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
});
