import React, { useEffect, useState, useCallback } from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LoadingView } from './src/components/LoadingView';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { FreedomDashboardScreen } from './src/screens/FreedomDashboardScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { COLORS } from './src/theme/tokens';

function parseBrowserPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { screen: 'home', authMode: 'login' };
  }
  const pathname = (window.location.pathname || '/').toLowerCase();
  if (pathname === '/freedom/login' || pathname === '/login') {
    return { screen: 'auth', authMode: 'login' };
  }
  if (pathname === '/freedom/register' || pathname === '/register') {
    return { screen: 'auth', authMode: 'freedom' };
  }
  if (pathname === '/join' || pathname === '/secret' || pathname === '/activate') {
    return { screen: 'auth', authMode: 'secret' };
  }
  if (pathname === '/freedom/dashboard' || pathname === '/portal') {
    return { screen: 'portal', authMode: 'login' };
  }
  return { screen: 'home', authMode: 'login' };
}

function updateBrowserPath(targetPath) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.pushState) {
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }
}

function AppNavigator() {
  const { user, bootstrapping } = useAuth();
  const initial = parseBrowserPath();
  const [activeTab, setActiveTab] = useState(initial.screen === 'home' ? 'home' : 'portal');
  const [authMode, setAuthMode] = useState(initial.authMode);
  const [viewScreen, setViewScreen] = useState(initial.screen); // 'home' | 'auth' | 'portal'

  // Sync state if browser back/forward buttons are clicked
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onPopState = () => {
      const next = parseBrowserPath();
      setViewScreen(next.screen);
      setAuthMode(next.authMode);
      if (next.screen === 'home') {
        setActiveTab('home');
      } else if (next.screen === 'portal') {
        setActiveTab('portal');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // When user auth state resolves
  useEffect(() => {
    if (user) {
      if (user.role === 'FREEDOM_PARTNER') {
        const next = parseBrowserPath();
        if (next.screen === 'home') {
          setActiveTab('home');
          updateBrowserPath('/');
        } else {
          setActiveTab('portal');
          updateBrowserPath('/freedom/dashboard');
        }
      } else {
        updateBrowserPath('/');
      }
    }
  }, [user?.id, user?.role]);

  const handleOpenAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setViewScreen('auth');
    if (mode === 'freedom') {
      updateBrowserPath('/freedom/register');
    } else if (mode === 'secret') {
      updateBrowserPath('/join');
    } else {
      updateBrowserPath('/freedom/login');
    }
  }, []);

  const handlePreviewHome = useCallback(() => {
    setViewScreen('home');
    updateBrowserPath('/');
  }, []);

  const handleAuthModeChange = useCallback((nextMode) => {
    setAuthMode(nextMode);
    if (nextMode === 'freedom') {
      updateBrowserPath('/freedom/register');
    } else if (nextMode === 'secret') {
      updateBrowserPath('/join');
    } else {
      updateBrowserPath('/freedom/login');
    }
  }, []);

  const handleSelectTab = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      updateBrowserPath('/');
    } else {
      updateBrowserPath('/freedom/dashboard');
    }
  }, []);

  if (bootstrapping) {
    return <LoadingView message="Loading StudyWallah..." />;
  }

  if (!user) {
    if (viewScreen === 'auth') {
      return (
        <AuthScreen
          initialMode={authMode}
          onModeChange={handleAuthModeChange}
          onPreviewHome={handlePreviewHome}
        />
      );
    }
    // Default or explicitly 'home'
    return <HomeScreen onOpenAuth={() => handleOpenAuth('login')} />;
  }

  // SECRET_PARTNER sees strictly the minimal educational StudyWallah Home UI
  // with zero extra role/portal/sign-out buttons.
  if (user.role === 'SECRET_PARTNER') {
    return <HomeScreen />;
  }

  // FREEDOM_PARTNER gets the Freedom Dashboard + Study Home switcher.
  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        {activeTab === 'home' ? (
          <HomeScreen onOpenPortal={() => handleSelectTab('portal')} />
        ) : (
          <FreedomDashboardScreen />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => handleSelectTab('home')}
          activeOpacity={0.8}
          style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
        >
          <Ionicons
            name="book-outline"
            size={16}
            color={activeTab === 'home' ? '#FFFFFF' : COLORS.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
            Study Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSelectTab('portal')}
          activeOpacity={0.8}
          style={[styles.tabItem, activeTab === 'portal' && styles.tabItemActive]}
        >
          <Ionicons
            name="school-outline"
            size={16}
            color={activeTab === 'portal' ? '#FFFFFF' : COLORS.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'portal' && styles.tabTextActive]}>
            Faculty Desk
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ANDROID_TOP_INSET = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) + 6 : 0;

export default function App() {
  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: ANDROID_TOP_INSET }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgCanvas,
  },
  screenArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSubtle,
  },
  tabItemActive: {
    backgroundColor: COLORS.brandDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
