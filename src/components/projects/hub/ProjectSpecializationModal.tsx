import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { specializationService, type Specialization } from '@/services/specialization.service';
import { toast } from '@/store/toast.store';
import type { HubProject } from '@/types/project-hub';
import {
  activeSpecializations,
  canSaveSpecialization,
  initialSpecializationId,
  specializationSaveError,
} from '@/utils/project-specialization';
import { messageOf } from './ProjectHubFields';
import { HubAction, HubIcon, HubModal, hubColors as c, ui } from './ProjectHubUI';

type Props = {
  project: HubProject;
  onLoaded?: (specialization: Specialization | null) => void;
  onSaved: (specialization: Specialization) => void;
  onClose: () => void;
};

export function ProjectSpecializationModal({ project, onLoaded, onSaved, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState<Specialization | null | undefined>(undefined);
  const [currentError, setCurrentError] = useState('');
  const [options, setOptions] = useState<Specialization[]>([]);
  const [optionsError, setOptionsError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadingCurrent, setReloadingCurrent] = useState(false);
  const [saveError, setSaveError] = useState('');

  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.allSettled([
      specializationService.getProjectSpecialization(project.id, controller.signal),
      specializationService.getSpecializations(controller.signal),
    ])
      .then(([currentResult, listResult]) => {
        if (controller.signal.aborted) return;

        let nextCurrent: Specialization | null = null;
        if (currentResult.status === 'fulfilled') {
          nextCurrent = currentResult.value;
          setCurrent(nextCurrent);
          onLoadedRef.current?.(nextCurrent);
        } else {
          setCurrentError(messageOf(currentResult.reason));
        }

        let nextOptions: Specialization[] = [];
        if (listResult.status === 'fulfilled') {
          nextOptions = activeSpecializations(listResult.value);
          setOptions(nextOptions);
        } else {
          setOptionsError(messageOf(listResult.reason));
        }

        if (currentResult.status === 'fulfilled' && listResult.status === 'fulfilled') {
          setSelectedId(initialSpecializationId(nextCurrent, nextOptions));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [project.id, attempt]);

  const retryLoad = () => {
    setLoading(true);
    setCurrent(undefined);
    setCurrentError('');
    setOptions([]);
    setOptionsError('');
    setSelectedId('');
    setDropdownOpen(false);
    setSaveError('');
    setAttempt(value => value + 1);
  };

  const hasLoadError = !!currentError || !!optionsError;
  const canSave = canSaveSpecialization({
    selectedId,
    current,
    loading: loading || reloadingCurrent,
    hasLoadError,
    busy,
  });
  const selectedOption = options.find(item => item.id === selectedId) ?? null;
  const dropdownDisabled = loading || busy || reloadingCurrent || !!optionsError || !!currentError;

  const close = () => {
    if (!busyRef.current) onClose();
  };

  async function save() {
    if (busyRef.current || !canSave) return;
    busyRef.current = true;
    setBusy(true);
    setSaveError('');
    setDropdownOpen(false);
    try {
      const saved = await specializationService.updateProjectSpecialization(project.id, selectedId);
      if (!aliveRef.current) return;
      toast.success('Đã cập nhật chuyên ngành dự án.');
      onSaved(saved);
      onClose();
    } catch (cause) {
      if (!aliveRef.current) return;
      const failure = specializationSaveError(cause);
      setSaveError(failure.message);
      if (failure.reloadCurrent) {
        setReloadingCurrent(true);
        try {
          const latest = await specializationService.getProjectSpecialization(project.id);
          if (aliveRef.current) {
            setCurrent(latest);
            onLoadedRef.current?.(latest);
          }
        } catch (reloadCause) {
          if (aliveRef.current) {
            setCurrentError(messageOf(reloadCause));
          }
        } finally {
          if (aliveRef.current) setReloadingCurrent(false);
        }
      }
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }

  return (
    <HubModal
      compact
      wide={false}
      icon="tag"
      title="Cập nhật chuyên ngành"
      subtitle="Chọn chuyên ngành phù hợp với định hướng của dự án."
      onClose={close}
      footer={
        <>
          <HubAction
            compact
            title="Hủy"
            onPress={close}
            disabled={busy}
            testID="specialization-cancel"
          />
          <HubAction
            compact
            title="Lưu"
            variant="primary"
            busy={busy}
            disabled={!canSave}
            onPress={() => void save()}
            testID="specialization-save"
          />
        </>
      }
    >
      <View style={styles.section}>
        <Text style={styles.label}>Chuyên ngành hiện tại</Text>
        {loading || reloadingCurrent ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={styles.muted}>Đang tải chuyên ngành hiện tại…</Text>
          </View>
        ) : currentError ? (
          <Text accessibilityRole="alert" style={ui.error}>
            {currentError}
          </Text>
        ) : (
          <Text testID="current-specialization-name" style={styles.currentValue}>
            {current ? current.name : 'Chưa chọn chuyên ngành'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Chuyên ngành</Text>
        {loading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={styles.muted}>Đang tải danh sách chuyên ngành…</Text>
          </View>
        ) : optionsError ? (
          <Text accessibilityRole="alert" style={ui.error}>
            {optionsError}
          </Text>
        ) : (
          <View style={styles.dropdownWrap}>
            <Pressable
              testID="specialization-dropdown-trigger"
              accessibilityRole="button"
              accessibilityLabel="Chuyên ngành"
              aria-expanded={dropdownOpen}
              accessibilityState={{ disabled: dropdownDisabled, expanded: dropdownOpen }}
              disabled={dropdownDisabled}
              onPress={() => setDropdownOpen(open => !open)}
              style={[
                styles.trigger,
                dropdownOpen && styles.triggerActive,
                dropdownDisabled && styles.disabled,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.triggerText, !selectedOption && styles.placeholderText]}
              >
                {selectedOption ? selectedOption.name : 'Chọn chuyên ngành'}
              </Text>
              <HubIcon name="chevron" size={16} color="#617292" />
            </Pressable>

            {dropdownOpen && (
              <View
                role="radiogroup"
                accessibilityLabel="Danh sách chuyên ngành"
                style={styles.menu}
              >
                <ScrollView style={styles.menuScroll} nestedScrollEnabled>
                  {options.length ? (
                    options.map(item => {
                      const selected = selectedId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          testID={`specialization-option-${item.id}`}
                          role="radio"
                          accessibilityLabel={item.name}
                          accessibilityState={{ checked: selected, disabled: busy }}
                          aria-checked={selected}
                          disabled={busy}
                          onPress={() => {
                            setSelectedId(item.id);
                            setDropdownOpen(false);
                            setSaveError('');
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            (selected || pressed) && styles.optionSelected,
                          ]}
                        >
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                            {item.name}
                          </Text>
                          {selected && <HubIcon name="check" size={17} color={c.primary} />}
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyOptions}>
                      Hiện chưa có chuyên ngành đang hoạt động.
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      {hasLoadError && !loading && (
        <View style={styles.retryRow}>
          <HubAction
            compact
            title="Thử tải lại"
            icon="refresh"
            onPress={retryLoad}
          />
        </View>
      )}

      {!!saveError && (
        <View style={styles.errorBanner}>
          <HubIcon name="warning" size={16} color={c.error} />
          <Text accessibilityRole="alert" style={styles.errorText}>
            {saveError}
          </Text>
        </View>
      )}
    </HubModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4DFF7',
    borderRadius: 12,
    backgroundColor: '#F5F7FF',
    gap: 8,
  },
  label: {
    color: c.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  currentValue: {
    color: c.navy,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  muted: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  dropdownWrap: {
    gap: 6,
  },
  trigger: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#D1DBF2',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
  },
  triggerActive: {
    borderColor: c.primary,
  },
  disabled: {
    opacity: 0.55,
  },
  triggerText: {
    flex: 1,
    minWidth: 0,
    color: c.ink,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholderText: {
    color: c.textSecondary,
    fontWeight: '400',
  },
  menu: {
    borderWidth: 1,
    borderColor: '#D7E0F4',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 5,
    boxShadow: '0 5px 14px rgba(34, 57, 107, 0.12)',
  },
  menuScroll: {
    maxHeight: 220,
  },
  option: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: '#E8F0FF',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    color: c.ink,
    fontSize: 13,
  },
  optionTextSelected: {
    color: c.primaryDark,
    fontWeight: '600',
  },
  emptyOptions: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
  retryRow: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3C7CC',
    backgroundColor: '#FFF5F6',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: c.error,
    fontSize: 12.5,
    lineHeight: 19,
  },
});

