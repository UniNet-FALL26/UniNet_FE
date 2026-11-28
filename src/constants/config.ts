export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
// SignalR hubs live at the backend origin, outside the REST /api prefix.
export const API_ORIGIN = API_URL ? new URL(API_URL).origin : '';
