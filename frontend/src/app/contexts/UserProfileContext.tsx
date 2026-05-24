import { createContext, useContext, ReactNode } from 'react';

export type UserProfile = 'relacionamento' | 'marketing' | 'arquitetura' | 'engenharia';

interface UserProfileContextType {
  userProfile: UserProfile;
  canEdit: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
}

interface UserProfileProviderProps {
  children: ReactNode;
  value: UserProfileContextType;
}

export function UserProfileProvider({ children, value }: UserProfileProviderProps) {
  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
