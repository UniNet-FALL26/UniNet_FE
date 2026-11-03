import * as SecureStore from 'expo-secure-store';

export const sessionPersistence = {
  read: () => SecureStore.getItemAsync('uninet.session.v1'),
  write: (value: string | null) => value === null
    ? SecureStore.deleteItemAsync('uninet.session.v1')
    : SecureStore.setItemAsync('uninet.session.v1', value),
};
