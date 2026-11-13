import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { clearToken, getToken, saveToken } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [pairStatus, setPairStatus] = useState(null);
  const [initialInvitation, setInitialInvitation] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const restoreSession = useCallback(async () => {
    setBootstrapping(true);
    try {
      const savedToken = await getToken();
      if (!savedToken) {
        setToken(null);
        setUser(null);
        setPairStatus(null);
        return;
      }
      const me = await apiClient.me(savedToken);
      setToken(savedToken);
      setUser(me.user);
      setPairStatus(me.pair_status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearToken();
      }
      setToken(null);
      setUser(null);
      setPairStatus(null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const applyAuthSuccess = useCallback(async (authResp) => {
    await saveToken(authResp.token);
    setToken(authResp.token);
    setUser(authResp.user);
    setInitialInvitation(authResp.invitation || null);
    setPairStatus(authResp.invitation ? authResp.invitation.pair_status : 'ACTIVE');
  }, []);

  const registerFreedom = useCallback(
    async ({ name, email, password }) => {
      const resp = await apiClient.registerFreedom({ name, email, password });
      await applyAuthSuccess(resp);
      return resp;
    },
    [applyAuthSuccess]
  );

  const joinSecret = useCallback(
    async ({ name, email, password, invitationCode }) => {
      const resp = await apiClient.joinSecret({
        name,
        email,
        password,
        invitation_code: invitationCode,
      });
      await applyAuthSuccess(resp);
      return resp;
    },
    [applyAuthSuccess]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const resp = await apiClient.login({ email, password });
      await saveToken(resp.token);
      setToken(resp.token);
      setUser(resp.user);
      setInitialInvitation(null);
      try {
        const me = await apiClient.me(resp.token);
        setUser(me.user);
        setPairStatus(me.pair_status);
      } catch {
        setPairStatus(null);
      }
      return resp;
    },
    []
  );

  const logout = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
    setPairStatus(null);
    setInitialInvitation(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const me = await apiClient.me(token);
    setUser(me.user);
    setPairStatus(me.pair_status);
    return me;
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        pairStatus,
        initialInvitation,
        bootstrapping,
        registerFreedom,
        joinSecret,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
