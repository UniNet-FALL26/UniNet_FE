import * as SecureStore from 'expo-secure-store';
export const paymentContextStore = {
  read: () => SecureStore.getItemAsync('uninet.payment-return.v1'),
  write: (value: string) => SecureStore.setItemAsync('uninet.payment-return.v1', value),
};
