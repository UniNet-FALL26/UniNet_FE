import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { colors } from "@/constants/colors";
import { projectService } from "@/services/project.service";
import type { Project } from "@/types/project";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const tabs = [
  "Đang tuyển",
  "Dự án của tôi",
  "Yêu cầu tham gia",
  "Lời mời đã gửi",
  "Lời mời nhận được",
  "Đã đóng tuyển",
] as const;

type Tab = (typeof tabs)[number];

export function ProjectExplorerScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);

  const [filterSearch, setFilterSearch] = useState("");

  // =========================
  // LOAD PROJECTS
  // =========================

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await projectService.listProjects();

        if (mounted) {
          setProjects(data);
        }
      } catch {
        if (mounted) {
          setError("Không thể tải danh sách dự án. Vui lòng thử lại sau.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================
  // AVAILABLE FILTER OPTIONS
  // =========================

  const availableSkills = useMemo(() => {
    const skills = projects.flatMap((project) => project.technologies ?? []);

    return Array.from(new Set(skills))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const availableRoles = useMemo(() => {
    const roles = projects.flatMap((project) =>
      (project.roles ?? []).map((role) => role.role),
    );

    return Array.from(new Set(roles))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [projects]);

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

  const filteredAvailableRoles = useMemo(() => {
    const keyword = filterSearch.trim().toLowerCase();

    if (!keyword) {
      return availableRoles;
    }

    return availableRoles.filter((role) =>
      role.toLowerCase().includes(keyword),
    );
  }, [availableRoles, filterSearch]);

  // =========================
  // OPEN FILTER MODAL
  // =========================

  const openFilter = () => {
    setDraftSkills(selectedSkills);
    setDraftRoles(selectedRoles);
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

  const toggleRole = (role: string) => {
    setDraftRoles((current) => {
      if (current.includes(role)) {
        return current.filter((item) => item !== role);
      }

      return [...current, role];
    });
  };

  // =========================
  // APPLY FILTER
  // =========================

  const applyFilter = () => {
    setSelectedSkills(draftSkills);
    setSelectedRoles(draftRoles);
    setFilterVisible(false);
  };

  // =========================
  // CLEAR FILTER
  // =========================

  const clearFilter = () => {
    setDraftSkills([]);
    setDraftRoles([]);
  };

  const clearAppliedFilter = () => {
    setSelectedSkills([]);
    setSelectedRoles([]);
  };

  // =========================
  // ACTIVE FILTER COUNT
  // =========================

  const activeFilterCount = selectedSkills.length + selectedRoles.length;

  // =========================
  // PROJECT FILTERING
  // =========================

  const filteredProjects = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      // =========================
      // TAB FILTER
      // =========================

      let matchesTab = true;

      switch (activeTab) {
        case "Dự án của tôi":
          matchesTab = project.creator.id === "current-user";
          break;

        case "Yêu cầu tham gia":
          matchesTab = project.recruitmentStatus === "ĐANG TUYỂN";
          break;

        case "Lời mời đã gửi":
          matchesTab = project.creator.id === "current-user";
          break;

        case "Lời mời nhận được":
          matchesTab = project.recruitmentStatus === "ĐANG TUYỂN";
          break;

        case "Đã đóng tuyển":
          matchesTab =
            project.recruitmentStatus === "ĐÃ ĐÓNG" ||
            project.recruitmentStatus === "HẾT HẠN";
          break;

        case "Đang tuyển":
        default:
          matchesTab = project.recruitmentStatus === "ĐANG TUYỂN";
          break;
      }

      if (!matchesTab) {
        return false;
      }

      // =========================
      // SEARCH FILTER
      // =========================

      if (keyword) {
        const title = project.title?.toLowerCase() ?? "";

        const creator = project.creator?.displayName?.toLowerCase() ?? "";

        const technologies = (project.technologies ?? [])
          .join(" ")
          .toLowerCase();

        const roles = (project.roles ?? [])
          .map((role) => role.role)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          title.includes(keyword) ||
          creator.includes(keyword) ||
          technologies.includes(keyword) ||
          roles.includes(keyword);

        if (!matchesSearch) {
          return false;
        }
      }

      // =========================
      // SKILL FILTER
      // =========================

      if (selectedSkills.length > 0) {
        const projectTechnologies = (project.technologies ?? []).map(
          (technology) => technology.toLowerCase(),
        );

        const matchesSkills = selectedSkills.every((skill) =>
          projectTechnologies.includes(skill.toLowerCase()),
        );

        if (!matchesSkills) {
          return false;
        }
      }

      // =========================
      // ROLE FILTER
      // =========================

      if (selectedRoles.length > 0) {
        const projectRoles = (project.roles ?? []).map((role) =>
          role.role.toLowerCase(),
        );

        const matchesRoles = selectedRoles.some((role) =>
          projectRoles.includes(role.toLowerCase()),
        );

        if (!matchesRoles) {
          return false;
        }
      }

      return true;
    });
  }, [projects, activeTab, searchQuery, selectedSkills, selectedRoles]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return <Loading />;
  }

  // =========================
  // RENDER
  // =========================

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================
            HEADER
        ========================= */}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Khám phá các dự án</Text>

            <Text style={styles.subtitle}>
              {filteredProjects.length > 0
                ? `${filteredProjects.length} dự án đang hiển thị`
                : "Tìm đồng đội phù hợp cho ý tưởng của bạn"}
            </Text>
          </View>

          <Button
            title="Tạo dự án"
            variant="primary"
            onPress={() => router.push("/group/create" as never)}
            style={styles.ctaButton}
          />
        </View>

        {/* =========================
            SEARCH + FILTER
        ========================= */}

        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm kiếm dự án, kỹ năng, vai trò..."
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
              style={[
                styles.filterButton,
                activeFilterCount > 0 && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilterCount > 0 && styles.filterButtonTextActive,
                ]}
              >
                ☷
              </Text>

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

              {selectedRoles.map((role) => (
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
        </View>

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
                onPress={() => setActiveTab(tab)}
                style={({ pressed }) => [
                  styles.tabButton,
                  isActive && styles.activeTabButton,
                  pressed && styles.tabPressed,
                ]}
              >
                <Text
                  numberOfLines={1}
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

        {error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageIcon}>!</Text>

            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : null}

        {/* =========================
            PROJECT LIST
        ========================= */}

        <View style={styles.content}>
          {filteredProjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyBadge}>
                <View style={styles.emptyBadgeDot} />
              </View>

              <Text style={styles.emptyTitle}>Chưa có dự án nào phù hợp</Text>

              <Text style={styles.emptyText}>
                Thử thay đổi từ khóa hoặc bộ lọc để tìm dự án phù hợp hơn.
              </Text>

              {(searchQuery.length > 0 || activeFilterCount > 0) && (
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
                onPress={() => router.push("/group/create" as never)}
                style={styles.emptyCta}
              />
            </View>
          ) : (
            filteredProjects.map((project) => {
              const isOpen = project.recruitmentStatus === "ĐANG TUYỂN";

              const progress =
                project.memberTarget > 0
                  ? Math.min(
                      project.currentMemberCount / project.memberTarget,
                      1,
                    )
                  : 0;

              return (
                <Pressable
                  key={project.id}
                  onPress={() =>
                    router.push({
                      pathname: "/group/[id]" as never,
                      params: {
                        id: project.id,
                      },
                    } as never)
                  }
                  style={({ pressed }) => [
                    styles.card,
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
                        <Text style={styles.creatorAvatarText}>
                          {getInitials(project.creator.displayName)}
                        </Text>
                      </View>

                      <View style={styles.projectInfo}>
                        <Text style={styles.projectTitle} numberOfLines={2}>
                          {project.title}
                        </Text>

                        <Text style={styles.metaText}>
                          {project.creator.displayName}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isOpen ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            isOpen
                              ? styles.statusDotOpen
                              : styles.statusDotClosed,
                          ]}
                        />

                        <Text style={styles.statusText}>
                          {project.recruitmentStatus}
                        </Text>
                      </View>
                    </View>

                    {/* MEMBER PROGRESS */}

                    <View style={styles.progressSection}>
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

                      <View style={styles.progressLabels}>
                        <Text style={styles.progressText}>
                          {project.currentMemberCount}/{project.memberTarget}{" "}
                          thành viên
                        </Text>

                        <Text style={styles.progressText}>
                          Hạn: {formatDate(project.recruitmentDeadline)}
                        </Text>
                      </View>
                    </View>

                    {/* ROLES */}

                    {project.roles.length > 0 && (
                      <View style={styles.roleRow}>
                        {project.roles.slice(0, 3).map((role) => (
                          <View key={role.id} style={styles.rolePill}>
                            <Text numberOfLines={1} style={styles.roleText}>
                              {role.role}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* TECHNOLOGIES */}

                    {project.technologies.length > 0 && (
                      <View style={styles.techRow}>
                        {project.technologies.slice(0, 3).map((tech) => (
                          <View key={tech} style={styles.techPill}>
                            <Text numberOfLines={1} style={styles.techText}>
                              {tech}
                            </Text>
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
                  Chọn kỹ năng và vai trò bạn quan tâm
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
                placeholder="Tìm kỹ năng hoặc vai trò..."
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

                {filteredAvailableSkills.length === 0 ? (
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
                  <Text style={styles.filterGroupTitle}>Vai trò</Text>

                  {draftRoles.length > 0 && (
                    <Text style={styles.filterGroupCount}>
                      {draftRoles.length} đã chọn
                    </Text>
                  )}
                </View>

                {filteredAvailableRoles.length === 0 ? (
                  <Text style={styles.noOptionText}>
                    Không tìm thấy vai trò phù hợp.
                  </Text>
                ) : (
                  <View style={styles.optionGrid}>
                    {filteredAvailableRoles.map((role) => {
                      const selected = draftRoles.includes(role);

                      return (
                        <Pressable
                          key={role}
                          onPress={() => toggleRole(role)}
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
    </>
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
    backgroundColor: colors.background,
  },

  screenContent: {
    paddingBottom: 32,
  },

  // =========================
  // HEADER
  // =========================

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  title: {
    color: colors.navy,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 29,
  },

  subtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  ctaButton: {
    minWidth: 104,
  },

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
    gap: 8,
    width: "100%",
  },

  searchContainer: {
    flex: 1,
    minWidth: 0,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#DCE4F0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: 13,
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
    width: 76,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE4F0",
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  filterButtonText: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 20,
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
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
  },

  tabButton: {
    height: 40,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#DCE4F0",
  },

  activeTabButton: {
    backgroundColor: "#EEF5FF",
    borderColor: colors.primary,
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
    color: colors.primary,
  },

  // =========================
  // CONTENT
  // =========================

  content: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 28,
    gap: 12,
  },

  // =========================
  // PROJECT CARD
  // =========================

  card: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE4F0",
    overflow: "hidden",

    shadowColor: "#0B3E9C",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  cardPressed: {
    opacity: 0.92,
  },

  accentBar: {
    width: 3,
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
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    width: "100%",
  },

  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    minWidth: 0,
  },

  projectTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    marginBottom: 1,
  },

  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },

  // =========================
  // MEMBER PROGRESS
  // =========================

  progressSection: {
    marginTop: 12,
  },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E9EEF6",
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
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  progressText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
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
    marginTop: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  techPill: {
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: "#DCE4F0",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  techText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },

  // =========================
  // CARD FOOTER
  // =========================

  footerRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E7ECF3",
    paddingTop: 10,
  },

  detailHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
