// src/context/PageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  editingMode: boolean;
  setEditingMode: (editing: boolean) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const usePage = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePage must be used within a PageProvider');
  }
  return context;
};

interface PageProviderProps {
  children: ReactNode;
}

export const PageProvider: React.FC<PageProviderProps> = ({ children }) => {
  const [activePage, setActivePage] = useState<string>('home');
  const [editingMode, setEditingMode] = useState<boolean>(false);

  const value: PageContextType = {
    activePage,
    setActivePage,
    editingMode,
    setEditingMode,
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};
