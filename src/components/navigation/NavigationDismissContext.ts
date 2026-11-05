import { createContext, useContext } from 'react';

export const NavigationDismissContext = createContext<(() => void) | undefined>(undefined);
export const useDismissDetail = () => useContext(NavigationDismissContext);
