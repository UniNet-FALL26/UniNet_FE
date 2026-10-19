import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import { skillService } from "@/services/skill.service";
import { projectFields } from "@/constants/project-fields";
import { API_PROJECT_STATUS_LABEL, ApiProjectStatus, ApiRecruitmentStatus, type ProjectListItem } from "@/types/project";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image as DecorativeImage } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

const tabs = [
  "Đang tuyển",
  "Dự án của tôi",
  "Dự án chờ duyệt",
  "Dự án hoàn thành",
  "Dự án bị từ chối",
] as const;

type Tab = (typeof tabs)[number];

export function ProjectExplorerScreen() {
  const insets = useSafeAreaInsets();
  const compactHero = useWindowDimensions().width < 768;
  const [searchFocused, setSearchFocused] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetry, setCatalogRetry] = useState(0);

  const [activeTab, setActiveTab] = useState<Tab>("Đang tuyển");

  const [error, setError] = useState<string | null>(null);

  // =========================
  // SEARCH
  // =========================

  const [searchQuery, setSearchQuery] = useState("");

  // =========================
  // FILTER
  // =========================

  const [filterVisible, setFilterVisible] = useState(false);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftFields, setDraftFields] = useState<string[]>([]);

  const [filterSearch, setFilterSearch] = useState("");

  // =========================
  // LOAD PROJECTS
  // =========================

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);
    skillService.getSkills(controller.signal).then((catalog) => {
      if (!controller.signal.aborted) setAvailableSkills(Array.from(new Set(catalog.map((skill) => skill.name))));
    }).catch((cause) => {
      if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : "Không thể tải danh mục kỹ năng.");
    }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [catalogRetry]);

  useEffect(() => {
    const timer = setTimeout(() => { setKeyword(searchQuery.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const statusTab = activeTab === "Dự án hoàn thành" ? ApiProjectStatus.Completed
    : activeTab === "Dự án chờ duyệt" ? ApiProjectStatus.Pending
    : activeTab === "Dự án bị từ chối" ? ApiProjectStatus.Rejected : undefined;
  const personalTab = activeTab !== "Đang tuyển";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setProjects([]);
    const request = statusTab !== undefined
      ? projectService.listProjectsByStatus(statusTab, page, 10, controller.signal)
      : personalTab
      ? projectService.listMyProjects({ page, pageSize: 10 }, controller.signal)
      : projectService.listProjects({ page, pageSize: 10, keyword, field: selectedFields[0], skillnames: selectedSkills,
      recruitmentStatus: activeTab === "Đang tuyển" ? ApiRecruitmentStatus.Open : undefined,
    }, controller.signal);
    request.then((data) => {
      if (controller.signal.aborted) return;
      setProjects(data.projects); setTotalPages(data.totalPages); setTotalItems(data.totalItems);
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      if (cause?.status === 404 || (cause instanceof Error && /^projects? not found\.?$/i.test(cause.message.trim()))) {
        setProjects([]); setTotalPages(0); setTotalItems(0); setError(null);
      } else setError(cause instanceof Error ? cause.message : "Không thể tải danh sách dự án.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, keyword, selectedFields, selectedSkills, activeTab, retry, statusTab, personalTab]);
  const availableFields = projectFields;

  // =========================
  // FILTER OPTIONS SEARCH
  // =========================

  const filteredAvailableSkills = useMemo(() => {
    const keyword = filterSearch.trim().toLowerCase();

    if (!keyword) {
      return availableSkills;
    }

    return availableSkills.filter((skill) =>
      skill.toLowerCase().includes(keyword),
    );
  }, [availableSkills, filterSearch]);

  const filteredAvailableFields = useMemo(() => {
    const keyword = filterSearch.trim().toLowerCase();

    if (!keyword) {
      return availableFields;
    }

    return availableFields.filter((role) =>
      role.toLowerCase().includes(keyword),
    );
  }, [availableFields, filterSearch]);

  // =========================
  // OPEN FILTER MODAL
  // =========================

  const openFilter = () => {
    setDraftSkills(selectedSkills);
    setDraftFields(selectedFields);
    setFilterSearch("");
    setFilterVisible(true);
  };

  // =========================
  // TOGGLE SKILL
  // =========================

  const toggleSkill = (skill: string) => {
    setDraftSkills((current) => {
      if (current.includes(skill)) {
        return current.filter((item) => item !== skill);
      }

      return [...current, skill];
    });
  };

  // =========================
  // TOGGLE ROLE
  // =========================

  const toggleField = (field: string) => {
    setDraftFields((current) => current.includes(field) ? [] : [field]);
  };

  // =========================
  // APPLY FILTER
  // =========================

  const applyFilter = () => {
    setPage(1);
    setSelectedSkills(draftSkills);
    setSelectedFields(draftFields);
    setFilterVisible(false);
  };

  // =========================
  // CLEAR FILTER
  // =========================

  const clearFilter = () => {
    setDraftSkills([]);
    setDraftFields([]);
  };

  const clearAppliedFilter = () => {
    setPage(1);
    setSelectedSkills([]);
    setSelectedFields([]);
  };

  // =========================
  // ACTIVE FILTER COUNT
  // =========================

  const activeFilterCount = selectedSkills.length + selectedFields.length;

  // =========================
  // PROJECT FILTERING
  // =========================

  const filteredProjects = projects.filter((project) => {
    return true;
  });

  // =========================
  // RENDER
  // =========================

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* =========================
            HEADER
        ========================= */}

        <View style={[styles.header, compactHero && styles.headerCompact]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants">
            <DecorativeImage source={require("../../../assets/images/project-explorer-hero.svg")} contentFit="cover" style={StyleSheet.absoluteFill} />
            <DecorativeImage source={require("../../../assets/images/project-explorer-team.svg")} contentFit="contain" style={[styles.heroArtwork, compactHero && styles.heroArtworkCompact]} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.eyebrowBadge}>
              <Text style={styles.eyebrow}>KẾT NỐI ĐỂ CÙNG TẠO NÊN GIÁ TRỊ</Text>
            </View>
            <Text style={[styles.title, compactHero && styles.titleCompact]}>Khám phá các dự án</Text>
            <Text style={styles.heroDescription}>Ý tưởng lớn bắt đầu từ một đội ngũ phù hợp.</Text>
          </View>
          <View style={styles.heroFooter}>
            <Text style={styles.subtitle}>
              {filteredProjects.length > 0
                ? `${filteredProjects.length} dự án tiềm năng / ${totalItems} kết quả`
                : "Tìm đồng đội phù hợp cho ý tưởng của bạn"}
            </Text>
            <Button
              title="＋ Tạo dự án"
              variant="primary"
              onPress={() => router.navigate("/group/create" as never)}
              style={styles.ctaButton}
              textStyle={styles.ctaButtonText}
            />
          </View>
        </View>

        {/* =========================
            SEARCH + FILTER
        ========================= */}

        {!personalTab && <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, (searchFocused || searchQuery.length > 0) && styles.searchContainerFocused]}>
              <View accessible={false} style={styles.searchLens}><View style={styles.searchLensHandle} /></View>

              <TextInput
                accessibilityLabel="Tìm kiếm dự án"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm dự án..."
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
                returnKeyType="search"
              />

              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={styles.clearSearchButton}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={openFilter}
              accessibilityRole="button"
              accessibilityLabel="Lọc dự án"
              style={({ pressed }) => [
                styles.filterButton,
                activeFilterCount > 0 && styles.filterButtonActive,
                pressed && styles.filterButtonPressed,
              ]}
            >
              <View accessible={false} style={styles.filterIcon}>
                {[0, 1, 2].map((row) => <View key={row} style={styles.filterIconRow}>
                  <View style={[styles.filterIconDot, activeFilterCount > 0 && styles.filterIconActive]} />
                  <View style={[styles.filterIconLine, activeFilterCount > 0 && styles.filterIconActive]} />
                </View>)}
              </View>

              <Text
                style={[
                  styles.filterButtonLabel,
                  activeFilterCount > 0 && styles.filterButtonTextActive,
                ]}
              >
                Lọc
              </Text>

              {activeFilterCount > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ACTIVE FILTER CHIPS */}

          {activeFilterCount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersContainer}
            >
              {selectedSkills.map((skill) => (
                <View key={`skill-${skill}`} style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>{skill}</Text>
                </View>
              ))}

              {selectedFields.map((role) => (
                <View key={`role-${role}`} style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>{role}</Text>
                </View>
              ))}

              <Pressable
                onPress={clearAppliedFilter}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>Xóa tất cả</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>}

        {/* =========================
            TABS
        ========================= */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          keyboardShouldPersistTaps="handled"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;

            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => { setPage(1); setActiveTab(tab); }}
                style={({ pressed }) => [
                  styles.tabButton,
                  isActive && styles.activeTabButton,
                  pressed && styles.tabPressed,
                ]}
              >
                <Text
                  style={[styles.tabText, isActive && styles.activeTabText]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* =========================
            ERROR
        ========================= */}

        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeading}>
            <View style={styles.sectionMarker} />
            <Text style={styles.resultsTitle}>{activeTab}</Text>
          </View>
          <Text style={styles.resultsCount}>{loading ? "Đang tải…" : `${totalItems} dự án`}</Text>
        </View>

        {error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageIcon}>!</Text>

            <Text style={styles.messageText}>{error}</Text>
            <Button title="Thử lại" onPress={() => setRetry((value) => value + 1)} />
          </View>
        ) : null}

        {/* =========================
            PROJECT LIST
        ========================= */}

        <View style={styles.content}>
          {loading ? <Loading /> : error ? null : filteredProjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyBadge}>
                <View style={styles.emptyBadgeDot} />
              </View>

              <Text style={styles.emptyTitle}>Không có dự án nào, vui lòng tạo dự án.</Text>

              {activeTab !== "Dự án của tôi" && (searchQuery.length > 0 || activeFilterCount > 0) && (
                <Pressable
                  onPress={() => {
                    setSearchQuery("");
                    clearAppliedFilter();
                  }}
                  style={styles.resetSearchButton}
                >
                  <Text style={styles.resetSearchButtonText}>
                    Xóa tìm kiếm & bộ lọc
                  </Text>
                </Pressable>
              )}

              <Button
                title="Tạo dự án mới"
                variant="primary"
                onPress={() => router.navigate("/group/create" as never)}
                style={styles.emptyCta}
              />
            </View>
          ) : (
            filteredProjects.map((project) => {
              // Some list endpoints omit status; these tabs already identify the project status.
              const projectStatus = project.status ?? statusTab ?? (activeTab === "Đang tuyển" ? ApiProjectStatus.Active : undefined);
              const isOpen = projectStatus === ApiProjectStatus.Active;
              // The API count excludes the project creator.
              const memberCount = project.currentMemberCount;

              const progress =
                project.memberTarget > 0
                  ? Math.min(
                      memberCount / project.memberTarget,
                      1,
                    )
                  : 0;

              return (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết dự án ${project.title}`}
                  onPress={() =>
                    router.push({
                      pathname: "/group/[id]" as never,
                      params: {
                        id: project.id,
                      },
                    } as never)
                  }
                  style={({ pressed, hovered }) => [
                    styles.card,
                    hovered && styles.cardHovered,
                    pressed && styles.cardPressed,
                  ]}
                >
                  {/* STATUS ACCENT */}

                  <View
                    style={[
                      styles.accentBar,
                      isOpen ? styles.accentOpen : styles.accentClosed,
                    ]}
                  />

                  <View style={styles.cardBody}>
                    {/* CARD HEADER */}

                    <View style={styles.cardHeader}>
                      <View style={styles.creatorAvatar}>
                        {project.creator.avatarUrl ? (
                          <Image source={{ uri: project.creator.avatarUrl }} style={{ width: "100%", height: "100%", borderRadius: 24 }} />
                        ) : (
                        <Text style={styles.creatorAvatarText}>
                          {getInitials((project.creator.fullName || project.creator.nickname || "Người tạo"))}
                        </Text>
                        )}
                      </View>

                      <View style={styles.projectInfo}>
                        <Text style={styles.projectTitle} numberOfLines={2}>
                          {project.title}
                        </Text>

                        <Text style={styles.metaText}>
                          {(project.creator.fullName || project.creator.nickname || "Người tạo")}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          projectStatus === ApiProjectStatus.Completed ? styles.statusCompleted : isOpen ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            projectStatus === ApiProjectStatus.Completed ? styles.statusDotCompleted : isOpen
                              ? styles.statusDotOpen
                              : styles.statusDotClosed,
                          ]}
                        />

                        <Text style={[styles.statusText, projectStatus === ApiProjectStatus.Completed && styles.statusTextCompleted]}>
                          {projectStatus !== undefined ? API_PROJECT_STATUS_LABEL[projectStatus] ?? "Chưa cập nhật" : "Chưa cập nhật"}
                        </Text>
                      </View>
                    </View>

                    {/* MEMBER METADATA & PROGRESS */}

                    <View style={styles.progressSection}>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressText}>
                          {memberCount}/{project.memberTarget}{" "}
                          thành viên
                        </Text>

                        <Text style={styles.progressText}>
                          Hạn: {formatDate(project.recruitmentDeadline)}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.round(progress * 100)}%`,
                            },
                            !isOpen && styles.progressFillClosed,
                          ]}
                        />
                      </View>


                    </View>

                    <Text style={styles.fieldText}>{project.projectField}</Text>
                    <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">{project.description}</Text>

                    {/* TECHNOLOGIES */}

                    {(project.skills ?? []).length > 0 && (
                      <View style={styles.techRow}>
                        {(project.skills ?? []).map((skill) => (
                          <View key={skill.skillId} style={styles.techPill}>
                            {skill.iconUrl ? (
                              <Image source={{ uri: skill.iconUrl }} style={styles.skillIcon} accessibilityLabel={skill.skillName} />
                            ) : null}
                            <View style={styles.skillInfo}>
                              <Text style={styles.techText}>{skill.skillName}
                                {skill.category ? <Text style={styles.skillMeta}> · {skill.category === "ToolsAndOther" ? "Công cụ và khác" : skill.category}</Text> : null}
                                {skill.minLevel != null ? <Text style={styles.skillMeta}> · Cấp độ tối thiểu: {skill.minLevel}</Text> : null}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* FOOTER */}

                    <View style={styles.footerRow}>
                      <Text style={styles.detailHint}>Xem chi tiết</Text>

                      <View style={styles.arrowCircle}>
                        <Text style={styles.arrow}>›</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
        {!loading && !error && totalPages > 1 && (
          <View style={styles.footerRow}>
            <Button title="Trang trước" disabled={page <= 1} onPress={() => setPage((value) => value - 1)} />
            <Text style={styles.metaText}>Trang {page}/{totalPages}</Text>
            <Button title="Trang sau" disabled={page >= totalPages} onPress={() => setPage((value) => value + 1)} />
          </View>
        )}
      </ScrollView>

      {/* =========================
          FILTER MODAL
      ========================= */}

      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setFilterVisible(false)}
          />

          <View style={styles.filterModal}>
            {/* MODAL HEADER */}

            <View style={styles.filterHeader}>
              <View>
                <Text style={styles.filterTitle}>Bộ lọc dự án</Text>

                <Text style={styles.filterSubtitle}>
                  Chọn kỹ năng và lĩnh vực bạn quan tâm
                </Text>
              </View>

              <Pressable
                onPress={() => setFilterVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            {/* FILTER SEARCH */}

            <View style={styles.filterSearchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>

              <TextInput
                value={filterSearch}
                onChangeText={setFilterSearch}
                placeholder="Tìm kỹ năng hoặc lĩnh vực..."
                placeholderTextColor={colors.textSecondary}
                style={styles.filterSearchInput}
              />

              {filterSearch.length > 0 && (
                <Pressable onPress={() => setFilterSearch("")}>
                  <Text style={styles.clearSearchText}>×</Text>
                </Pressable>
              )}
            </View>

            {/* FILTER CONTENT */}

            <ScrollView
              style={styles.filterScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SKILLS */}

              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Text style={styles.filterGroupTitle}>
                    Kỹ năng / Công nghệ
                  </Text>

                  {draftSkills.length > 0 && (
                    <Text style={styles.filterGroupCount}>
                      {draftSkills.length} đã chọn
                    </Text>
                  )}
                </View>

                {catalogLoading ? <Text style={styles.noOptionText}>Đang tải kỹ năng…</Text> : catalogError ? (
                  <View>
                    <Text accessibilityRole="alert" style={styles.noOptionText}>{catalogError}</Text>
                    <Button title="Thử tải lại kỹ năng" variant="outline" onPress={() => setCatalogRetry((value) => value + 1)} />
                  </View>
                ) : filteredAvailableSkills.length === 0 ? (
                  <Text style={styles.noOptionText}>
                    Không tìm thấy kỹ năng phù hợp.
                  </Text>
                ) : (
                  <View style={styles.optionGrid}>
                    {filteredAvailableSkills.map((skill) => {
                      const selected = draftSkills.includes(skill);

                      return (
                        <Pressable
                          key={skill}
                          onPress={() => toggleSkill(skill)}
                          style={[
                            styles.optionChip,
                            selected && styles.optionChipSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              selected && styles.checkboxSelected,
                            ]}
                          >
                            {selected && (
                              <Text style={styles.checkboxCheck}>✓</Text>
                            )}
                          </View>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.optionChipText,
                              selected && styles.optionChipTextSelected,
                            ]}
                          >
                            {skill}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* ROLES */}

              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Text style={styles.filterGroupTitle}>Lĩnh vực</Text>

                  {draftFields.length > 0 && (
                    <Text style={styles.filterGroupCount}>
                      {draftFields.length} đã chọn
                    </Text>
                  )}
                </View>

                {filteredAvailableFields.length === 0 ? (
                  <Text style={styles.noOptionText}>
                    Không tìm thấy lĩnh vực phù hợp.
                  </Text>
                ) : (
                  <View style={styles.optionGrid}>
                    {filteredAvailableFields.map((role) => {
                      const selected = draftFields.includes(role);

                      return (
                        <Pressable
                          key={role}
                          onPress={() => toggleField(role)}
                          style={[
                            styles.optionChip,
                            selected && styles.optionChipSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              selected && styles.checkboxSelected,
                            ]}
                          >
                            {selected && (
                              <Text style={styles.checkboxCheck}>✓</Text>
                            )}
                          </View>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.optionChipText,
                              selected && styles.optionChipTextSelected,
                            ]}
                          >
                            {role}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* MODAL FOOTER */}

            <View style={styles.filterFooter}>
              <Pressable onPress={clearFilter} style={styles.clearFilterButton}>
                <Text style={styles.clearFilterButtonText}>Xóa bộ lọc</Text>
              </Pressable>

              <Pressable onPress={applyFilter} style={styles.applyFilterButton}>
                <Text style={styles.applyFilterButtonText}>Áp dụng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =========================
// HELPERS
// =========================

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0) {
    return "?";
  }

  const last = parts[parts.length - 1];

  return last.charAt(0).toUpperCase();
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  // =========================
  // SCREEN
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#F2F5FC",
  },

  screenContent: {
    paddingTop: 16,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },

  // =========================
  // HEADER
  // =========================

  header: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    minHeight: 156,
    backgroundColor: "#102D62",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#AEC9F4",
    overflow: "hidden",
    gap: 0,
  },

  headerCompact: { padding: 18, minHeight: 200, gap: 12 },
  heroArtwork: { position: "absolute", width: 340, height: 176, right: 100, top: -4 },
  heroArtworkCompact: { right: -100, opacity: 0.22 },
  eyebrowBadge: { marginBottom: 10 },
  heroDescription: { color: "#CCDCF5", fontSize: 13, lineHeight: 20, marginTop: 8 },
  heroFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 },
  resultsHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  resultsHeading: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  sectionMarker: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  resultsTitle: { fontSize: 17, fontWeight: "800", color: colors.navy, flexShrink: 1 },
  resultsCount: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: "#6DCCFF",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 42,
  },
  titleCompact: { fontSize: 27, lineHeight: 34 },

  subtitle: {
    marginTop: 3,
    color: "#CCDCF5",
    fontSize: 12,
    lineHeight: 17,
  },

  ctaButton: {
    backgroundColor: "#287AF0",
    minWidth: 96,
    minHeight: 38,
    paddingHorizontal: 12,
    flexShrink: 0,
    borderRadius: 8,
  },
  ctaButtonText: { fontSize: 12, fontWeight: "700" },

  // =========================
  // SEARCH
  // =========================

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },

  searchContainer: {
    flex: 1,
    minWidth: 0,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "#D7E6FF",
    borderRadius: 13,
    paddingHorizontal: 16,
  },

  searchContainerFocused: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterButtonPressed: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  fieldText: { color: colors.primaryDark, fontSize: 12, fontWeight: "600", lineHeight: 17, marginBottom: 3 },
  descriptionText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchLens: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, marginRight: 14 },
  searchLensHandle: { position: "absolute", width: 6, height: 2, borderRadius: 1, backgroundColor: colors.primary, right: -5, bottom: -2, transform: [{ rotate: "45deg" }] },
  filterIcon: { gap: 2 },
  filterIconRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  filterIconDot: { width: 3, height: 3, borderRadius: 1, backgroundColor: colors.textSecondary },
  filterIconLine: { width: 10, height: 2, borderRadius: 1, backgroundColor: colors.textSecondary },
  filterIconActive: { backgroundColor: colors.primary },

  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: 12,
    paddingVertical: 10,
  },

  clearSearchButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 22,
    lineHeight: 22,
  },

  filterButton: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    boxShadow: "0 2px 6px #16366B12",
  },

  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  filterButtonLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  filterButtonTextActive: {
    color: colors.primary,
  },

  filterCountBadge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  activeFiltersContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 7,
  },

  activeFilterChip: {
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  activeFilterChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  clearFiltersButton: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: "center",
  },

  clearFiltersText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: "700",
  },

  // =========================
  // TABS
  // =========================

  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    alignItems: "center",
  },

  tabButton: {
    minHeight: 44,
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeTabButton: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },

  tabPressed: {
    opacity: 0.75,
  },

  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    includeFontPadding: false,
  },

  activeTabText: {
    color: colors.surface,
  },

  // =========================
  // CONTENT
  // =========================

  content: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 18,
  },

  // =========================
  // PROJECT CARD
  // =========================

  card: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1E8F5",
    overflow: "hidden",

    shadowColor: "#0B3E9C",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  cardHovered: { borderColor: colors.primary, shadowOpacity: 0.13, shadowRadius: 18 },

  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  accentBar: {
    width: 4,
  },

  accentOpen: {
    backgroundColor: colors.primary,
  },

  accentClosed: {
    backgroundColor: colors.border,
  },

  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },

  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    flexShrink: 0,
  },

  creatorAvatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },

  projectInfo: {
    flex: 1,
    minWidth: 110,
  },

  projectTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 2,
  },

  metaText: {
    color: colors.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  // =========================
  // STATUS
  // =========================

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: "center",
    flexShrink: 0,
  },

  statusOpen: {
    backgroundColor: "#EAF9F4",
    borderWidth: 1,
    borderColor: "#B9E7D6",
  },

  statusClosed: {
    backgroundColor: "#FCECEF",
    borderWidth: 1,
    borderColor: "#F0C2C8",
  },

  statusCompleted: {
    backgroundColor: colors.projectCompletedBackground,
    borderWidth: 1,
    borderColor: colors.projectCompletedBorder,
  },
  statusDotCompleted: { backgroundColor: colors.projectCompleted },
  statusTextCompleted: { color: colors.projectCompleted },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusDotOpen: {
    backgroundColor: "#1FAE7A",
  },

  statusDotClosed: {
    backgroundColor: "#D8465F",
  },

  statusText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },

  // =========================
  // MEMBER PROGRESS
  // =========================

  progressSection: {
    marginTop: 16,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#F4F7FD",
    borderRadius: 12,
    gap: 7,
  },

  progressTrack: {
    height: 7,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  progressFillClosed: {
    backgroundColor: colors.border,
  },

  progressLabels: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },

  progressText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  // =========================
  // ROLES
  // =========================

  roleRow: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  rolePill: {
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  roleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  // =========================
  // TECHNOLOGIES
  // =========================

  techRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  techPill: {
    maxWidth: "100%",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    borderWidth: 1,
    borderColor: "#D3E4FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  techText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  skillIcon: { width: 18, height: 18, borderRadius: 4 },
  skillInfo: { flexShrink: 1, gap: 2 },
  skillMeta: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },

  // =========================
  // CARD FOOTER
  // =========================

  footerRow: {
    marginTop: 16,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },

  detailHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },

  arrow: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 15,
    marginLeft: 1,
  },

  // =========================
  // EMPTY STATE
  // =========================

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: 28,
    alignItems: "center",
  },

  emptyBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    marginBottom: 14,
  },

  emptyBadgeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },

  emptyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },

  resetSearchButton: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },

  resetSearchButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCta: {
    marginTop: 18,
    minWidth: 160,
  },

  // =========================
  // ERROR MESSAGE
  // =========================

  messageCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF2F3",
    borderColor: "#F5C9CF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  messageIcon: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "800",
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    lineHeight: 18,
    backgroundColor: "#FBD7DB",
    overflow: "hidden",
  },

  messageText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  // =========================
  // FILTER MODAL
  // =========================

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  filterModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 18,
  },

  filterHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  filterTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
  },

  filterSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: colors.textSecondary,
    fontSize: 23,
    lineHeight: 23,
  },

  // =========================
  // FILTER SEARCH
  // =========================

  filterSearchContainer: {
    marginHorizontal: 20,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  filterSearchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 9,
  },

  // =========================
  // FILTER SCROLL
  // =========================

  filterScroll: {
    paddingHorizontal: 20,
    marginTop: 4,
  },

  filterGroup: {
    paddingTop: 20,
  },

  filterGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  filterGroupTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "800",
  },

  filterGroupCount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionChip: {
    maxWidth: "100%",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  optionChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkboxCheck: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },

  optionChipText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  optionChipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },

  noOptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingVertical: 8,
  },

  // =========================
  // FILTER FOOTER
  // =========================

  filterFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.background,
  },

  clearFilterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  clearFilterButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  applyFilterButton: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  applyFilterButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
