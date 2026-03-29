import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  name: string;
  email: string;
  avatar: string;
};

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading session from secure storage
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const login = async () => {
    setIsLoading(true);
    // Simulate network request for Google OAuth validation
    await new Promise(resolve => setTimeout(resolve, 800));
    setUser({
      name: 'Student User',
      email: 'student@gmail.com',
      avatar: 'https://ui-avatars.com/api/?name=Student+User&background=random',
    });
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
