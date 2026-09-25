// Session stays in memory until secure native storage is available.
// Never persist passwords or tokens in unencrypted storage.
let accessToken: string | null = null;
export const tokenStorage = {
  get: async () => accessToken,
  set: async (value: string) => { accessToken = value; },
  clear: async () => { accessToken = null; },
};
