'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of your context data
interface AppContextType {
  // Add your context state and functions here
  // Example:
  // userName: string;
  // setUserName: (name: string) => void;
  testState: string;
  setTestState: (value: string) => void;
}

// Create the context with a default undefined value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Define the props for the provider
interface AppContextProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  // Example state
  const [testState, setTestState] = useState<string>('Initial Test State');

  // Add other state and functions as needed

  const contextValue: AppContextType = {
    testState,
    setTestState,
    // Add other state and functions to the context value
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Create a custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
