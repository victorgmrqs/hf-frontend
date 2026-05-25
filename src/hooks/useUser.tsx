import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { financeService, User } from '../services/financeService';

interface UserContextType {
  currentUser: User | null;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  loading: boolean;
  refreshUsers: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'hf_current_user';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setInternalCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = async () => {
    try {
      const { data } = await financeService.getUsers();
      if (data) {
        setAllUsers(data);
        
        // Try to restore from localStorage
        const savedUserId = localStorage.getItem(STORAGE_KEY);
        if (savedUserId) {
          const user = data.find(u => u.id === savedUserId);
          if (user) {
            setInternalCurrentUser(user);
          } else if (data.length > 0) {
            setInternalCurrentUser(data[0]);
          }
        } else if (data.length > 0) {
          setInternalCurrentUser(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const setCurrentUser = (user: User) => {
    setInternalCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, user.id);
  };

  return (
    <UserContext.Provider value={{ currentUser, allUsers, setCurrentUser, loading, refreshUsers }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
