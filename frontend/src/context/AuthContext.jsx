import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const isAuthenticated = Boolean(token && user);

  // ตรวจสอบสิทธิ์การเข้าถึงทีม
  const hasTeamAccess = (teamName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (Array.isArray(user.allowedTeams)) {
      if (user.allowedTeams.includes('*')) return true;
      return user.allowedTeams.map(t => t.toLowerCase()).includes(teamName.toLowerCase());
    }
    return false;
  };

  const canAccessNDS = hasTeamAccess('nds');
  const canAccessCDS = hasTeamAccess('cds');
  const canAccessBoth = canAccessNDS && canAccessCDS;

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const { token: receivedToken, user: receivedUser } = res.data.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
      localStorage.setItem('isAuthenticated', 'true');

      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasTeamAccess,
    canAccessNDS,
    canAccessCDS,
    canAccessBoth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
