import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Student } from '../api/types';
import {
  apiClient,
  getStoredToken,
  setStoredToken,
  getStoredAccount,
  setStoredAccount,
  getStoredActiveStudentId,
  setStoredActiveStudentId,
  setUnauthorizedHandler,
} from '../api/client';

interface AuthContextType {
  token: string | null;
  account: Account | null;
  students: Student[];
  activeStudent: Student | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Account>;
  loginWithStudentCode: (studentCode: string) => Promise<Account>;
  signup: (
    email: string,
    password: string,
    role?: 'parent' | 'teacher',
    name?: string
  ) => Promise<void>;
  logout: () => void;
  selectStudent: (student: Student) => void;
  refreshStudents: () => Promise<Student[]>;
  createStudent: (name: string, age: number, className: string, currentTier?: number) => Promise<Student>;
  updateStudentTierLocallyOrApi: (tier: number) => Promise<void>;
  updateActiveStudentState: (partial: Partial<Student>) => void;
  authError: string | null;
  clearAuthError: () => void;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getStoredToken());
  const [account, setAccountState] = useState<Account | null>(getStoredAccount());
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudentState] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Wipe localStorage too, not just React state -- otherwise the stale
      // token is re-read on the next page load and the app bounces between
      // 401 responses and a phantom "logged in" screen.
      setStoredToken(null);
      setStoredAccount(null);
      setStoredActiveStudentId(null);
      setTokenState(null);
      setAccountState(null);
      setStudents([]);
      setActiveStudentState(null);
      setAuthError('Your session has expired. Please log in again.');
    });

    if (token) {
      // Fetch fresh students list on mount if logged in
      fetchStudentsList();
    }
  }, [token]);

  const fetchStudentsList = async (): Promise<Student[]> => {
    try {
      const list = await apiClient.getStudents();
      const studentArray = Array.isArray(list) ? list : [];
      setStudents(studentArray);

      // Restore active student
      const savedActiveId = getStoredActiveStudentId();
      if (savedActiveId) {
        const found = studentArray.find((s) => s.id === savedActiveId);
        if (found) {
          setActiveStudentState(found);
        } else if (studentArray.length > 0) {
          setActiveStudentState(studentArray[0]);
          setStoredActiveStudentId(studentArray[0].id);
        } else {
          setActiveStudentState(null);
          setStoredActiveStudentId(null);
        }
      } else if (studentArray.length > 0) {
        setActiveStudentState(studentArray[0]);
        setStoredActiveStudentId(studentArray[0].id);
      } else {
        setActiveStudentState(null);
        setStoredActiveStudentId(null);
      }
      return studentArray;
    } catch {
      return [];
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.login(email, password);
      setStoredToken(response.token);
      setStoredAccount(response.account);
      setTokenState(response.token);
      setAccountState(response.account);

      const returnedStudents = Array.isArray(response.students) ? response.students : [];
      setStudents(returnedStudents);

      if (returnedStudents.length > 0) {
        setActiveStudentState(returnedStudents[0]);
        setStoredActiveStudentId(returnedStudents[0].id);
      } else {
        setActiveStudentState(null);
        setStoredActiveStudentId(null);
      }
      return response.account;
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithStudentCode = async (studentCode: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.loginWithStudentCode(studentCode);
      setStoredToken(response.token);
      setStoredAccount(response.account);
      setTokenState(response.token);
      setAccountState(response.account);

      const returnedStudents = Array.isArray(response.students) ? response.students : [];
      setStudents(returnedStudents);

      if (returnedStudents.length > 0) {
        setActiveStudentState(returnedStudents[0]);
        setStoredActiveStudentId(returnedStudents[0].id);
      } else {
        setActiveStudentState(null);
        setStoredActiveStudentId(null);
      }
      return response.account;
    } catch (err: any) {
      const msg = err.message || 'Student ID login failed. Please check your ID code.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: 'parent' | 'teacher' = 'parent',
    name?: string
  ) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.signup(email, password, role, name);
      setStoredToken(response.token);
      setStoredAccount(response.account);
      setTokenState(response.token);
      setAccountState(response.account);

      const returnedStudents = Array.isArray(response.students) ? response.students : [];
      setStudents(returnedStudents);

      if (returnedStudents.length > 0) {
        setActiveStudentState(returnedStudents[0]);
        setStoredActiveStudentId(returnedStudents[0].id);
      } else {
        setActiveStudentState(null);
        setStoredActiveStudentId(null);
      }
    } catch (err: any) {
      const msg = err.message || 'Signup failed. Please try a different email or password.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setStoredAccount(null);
    setStoredActiveStudentId(null);
    setTokenState(null);
    setAccountState(null);
    setStudents([]);
    setActiveStudentState(null);
    setAuthError(null);
  };

  const selectStudent = (student: Student) => {
    setActiveStudentState(student);
    setStoredActiveStudentId(student.id);
  };

  const createStudent = async (
    name: string,
    age: number,
    className: string,
    currentTier: number = 1
  ): Promise<Student> => {
    const created = await apiClient.createStudent({ name, age, className, currentTier });
    setStudents((prev) => [...prev, created]);
    selectStudent(created);
    return created;
  };

  const updateStudentTierLocallyOrApi = async (tier: number) => {
    if (!activeStudent) return;
    // Placement quiz only: the learner sets their own starting tier through the
    // dedicated placement endpoint. Rejections (e.g. a parent or a non-owner
    // session) propagate instead of being masked by a local-only update, so the
    // UI can never claim a tier the server hasn't recorded.
    const updated = await apiClient.completeStudentPlacement(activeStudent.id, tier);
    setActiveStudentState(updated);
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const updateActiveStudentState = (partial: Partial<Student>) => {
    if (!activeStudent) return;
    const updated = { ...activeStudent, ...partial };
    setActiveStudentState(updated);
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string }) => {
    const updated = await apiClient.updateMyProfile(data);
    setStoredAccount(updated);
    setAccountState(updated);
    if (updated.studentId) updateActiveStudentState({ name: updated.name, avatarUrl: updated.avatarUrl });
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        account,
        students,
        activeStudent,
        isAuthenticated: !!token && !!account,
        isLoading,
        login,
        loginWithStudentCode,
        signup,
        logout,
        selectStudent,
        refreshStudents: fetchStudentsList,
        createStudent,
        updateStudentTierLocallyOrApi,
        updateActiveStudentState,
        authError,
        clearAuthError: () => setAuthError(null),
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
