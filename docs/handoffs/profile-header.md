# Personal profile header

- Profile tab has a fixed header with left “Mẫu hồ sơ” action and right settings gear, both with 44px touch targets and accessible labels.
- Actions open `/profile/templates` and `/settings`. Templates route shows an empty state and a back button; previous designs remain removed.
- ModulePage has an optional header slot; other module screens retain their layout.
- TypeScript and Expo web export pass. Evaluated profile component with mocked platform modules to verify button order, labels and navigation callbacks. Template empty state and settings route exist in export. Profile HTML only renders the tab shell statically, so header appearance requires runtime verification; physical Android was not tested.
