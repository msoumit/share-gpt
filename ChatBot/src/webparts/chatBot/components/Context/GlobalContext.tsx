import * as React from 'react';
import { createContext, useContext, ReactNode } from 'react';
import { ConfigModel, UserModel } from '../../service/model';
import { WebPartContext } from '@microsoft/sp-webpart-base';

interface GlobalContextProps {
  description?: string;
  isDarkTheme?: boolean;
  environmentMessage?: string;
  hasTeamsContext?: boolean;
  userDisplayName?: string;
  currentUser: UserModel;
  context: WebPartContext;
  globalConfig: ConfigModel;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

export const GlobalProvider: React.FC<{ value: GlobalContextProps; children: ReactNode }> = ({ value, children }) => {
  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextProps => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
