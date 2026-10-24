
import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import AuthScreen, { type AuthUser } from './pages/AuthScreen';
import AddTurfScreen, { type AddTurfPayload } from './pages/AddTurfScreen';
import AdminDashboardScreen from './pages/AdminDashboardScreen';
import CustomerProfileScreen from './pages/CustomerProfileScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import OwnerDashboardScreen from './pages/OwnerDashboardScreen';
import OwnerProfileScreen from './pages/OwnerProfileScreen';
import SavedTurfsScreen from './pages/SavedTurfsScreen';
import PaymentScreen from './pages/PaymentScreen';
import SlotScreen from './pages/SlotScreen';
import TurfDetailsScreen from './pages/TurfDetailsScreen';
import HomeScreen from './pages/HomeScreen';
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AboutUs from './pages/AboutUs';
import SiteFooter from './pages/SiteFooter';

type Route =
  | 'auth'
  | 'home'
  | 'admin'
  | 'owner'
  | 'ownerProfile'
  | 'addTurf'
  | 'profile'
  | 'notifications'
  | 'savedTurfs'
  | 'turfDetails'
  | 'slot'
  | 'payment'
  | 'terms-conditions'
  | 'privacy-policy'
  | 'about';

type SlotSelection = {
  turf: any;
  court: any;
  bookings: any;
  totalAmount: number;
};

const USER_STORAGE_KEY = '@user_data';

const ALL_ROUTES: Route[] = [
  'auth',
  'home',
  'admin',
  'owner',
  'ownerProfile',
  'addTurf',
  'profile',
  'notifications',
  'savedTurfs',
  'turfDetails',
  'slot',
  'payment',
  'terms-conditions',
  'privacy-policy',
  'about',
];

const PROTECTED_ROUTES: Route[] = [
  'admin',
  'owner',
  'ownerProfile',
  'addTurf',
  'profile',
  'notifications',
  'savedTurfs',
  'slot',
  'payment',
];

function isRoute(value: unknown): value is Route {
  return (
    typeof value === 'string' &&
    ALL_ROUTES.includes(value as Route)
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [route, setRoute] = useState<Route>('home');

  const [selectedTurf, setSelectedTurf] = useState<any>(null);
  const [slotSelection, setSlotSelection] =
    useState<SlotSelection | null>(null);

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [redirectTo, setRedirectTo] = useState<Route | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Prevent a browser Back action from immediately pushing
  // the same route back into browser history.
  const skipNextHistoryPush = useRef(false);

  // -------------------------------------------------------
  // RESTORE USER SESSION
  // -------------------------------------------------------

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        if (
          parsedUser &&
          typeof parsedUser._id === 'string' &&
          parsedUser._id.length > 0
        ) {
          setUser(parsedUser as AuthUser);
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to restore user session:', error);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // -------------------------------------------------------
  // BROWSER HISTORY
  // -------------------------------------------------------

  useEffect(() => {
    if (isLoadingSession) {
      return;
    }

    if (skipNextHistoryPush.current) {
      skipNextHistoryPush.current = false;

      // The browser has already moved to the previous history
      // entry, so update its state without adding another entry.
      window.history.replaceState(
        { route },
        '',
        `#${route}`,
      );

      return;
    }

    window.history.pushState(
      { route },
      '',
      `#${route}`,
    );
  }, [route, isLoadingSession]);

  useEffect(() => {
    if (isLoadingSession) {
      return;
    }

    const handlePopState = (event: PopStateEvent) => {
      const previousRoute = event.state?.route;

      skipNextHistoryPush.current = true;

      setShowLoginModal(false);

      if (isRoute(previousRoute)) {
        setRoute(previousRoute);
      } else {
        setRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoadingSession]);

  // -------------------------------------------------------
  // COMMON NAVIGATION
  // -------------------------------------------------------

  const navigateTo = useCallback((destination: Route) => {
    setRoute(destination);
    setShowLoginModal(false);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.state?.route) {
      window.history.back();
    } else {
      navigateTo('home');
    }
  }, [navigateTo]);

  const handleGoHome = useCallback(() => {
    setShowLoginModal(false);
    setRedirectTo(null);
    navigateTo('home');
  }, [navigateTo]);

  // -------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------

  const handleAuthSuccess = (
    authenticatedUser: AuthUser,
    isNewSignup = false,
  ) => {
    setUser(authenticatedUser);

    try {
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(authenticatedUser),
      );
    } catch (error) {
      console.error('Failed to save user session:', error);
    }

    // Return the user to the protected page they originally
    // wanted to open.
    if (redirectTo) {
      const destination = redirectTo;

      setRedirectTo(null);
      setShowLoginModal(false);
      navigateTo(destination);

      return;
    }

    if (authenticatedUser.role === 'admin') {
      navigateTo('admin');
      return;
    }

    if (isNewSignup) {
      navigateTo('addTurf');
      return;
    }

    navigateTo('home');
  };

  const handleLogout = () => {
    setUser(null);
    setRedirectTo(null);
    setShowLoginModal(false);
    setSelectedTurf(null);
    setSlotSelection(null);

    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }

    navigateTo('home');
  };

  // -------------------------------------------------------
  // LOGIN REQUIRED
  // -------------------------------------------------------

  const requireLogin = (
    action?: () => void,
    destination?: Route,
  ) => {
    if (!user) {
      if (destination) {
        setRedirectTo(destination);
      }

      setShowLoginModal(true);
      return;
    }

    if (action) {
      action();
    }
  };

  const cancelLogin = () => {
    setShowLoginModal(false);
    setRedirectTo(null);
  };

  const openLogin = () => {
    setShowLoginModal(false);
    navigateTo('auth');
  };

  // -------------------------------------------------------
  // TURF ACTIONS
  // -------------------------------------------------------

  const handleAddTurfComplete = (_turf?: any) => {
    navigateTo('home');
  };

  const handleAddTurfSkip = () => {
    navigateTo('home');
  };

  const handleNavigateAddCourt = (_payload: AddTurfPayload) => {
    navigateTo('ownerProfile');
  };

  // -------------------------------------------------------
  // FOOTER AND ABOUT PAGE NAVIGATION
  // -------------------------------------------------------

  const handleFooterNavigate = (page: string) => {
    // Support both the current route names and common names
    // that may already be used by SiteFooter.
    const routeAliases: Record<string, Route> = {
      home: 'home',
      explore: 'home',
      'explore-turfs': 'home',

      auth: 'auth',
      login: 'auth',
      register: 'auth',

      owner: 'owner',
      'owner-dashboard': 'owner',

      ownerProfile: 'ownerProfile',
      'owner-profile': 'ownerProfile',

      addTurf: 'addTurf',
      'add-turf': 'addTurf',

      savedTurfs: 'savedTurfs',
      'saved-turfs': 'savedTurfs',

      about: 'about',
      'about-us': 'about',

      'privacy-policy': 'privacy-policy',
      privacy: 'privacy-policy',

      'terms-conditions': 'terms-conditions',
      terms: 'terms-conditions',
      'terms-and-conditions': 'terms-conditions',
    };

    const destination = routeAliases[page];

    if (!destination) {
      // Contact Us can remain a mailto link in SiteFooter.
      console.warn(`Unknown footer navigation destination: ${page}`);
      return;
    }

    if (destination === 'home') {
      handleGoHome();
      return;
    }

    if (destination === 'auth') {
      setRedirectTo(null);
      navigateTo('auth');
      return;
    }

    if (PROTECTED_ROUTES.includes(destination) && !user) {
      setRedirectTo(destination);
      setShowLoginModal(true);
      return;
    }

    // Do not allow a non-admin account to open the admin panel.
    if (destination === 'admin' && user?.role !== 'admin') {
      navigateTo('home');
      return;
    }

    setShowLoginModal(false);
    navigateTo(destination);
  };

  // -------------------------------------------------------
  // RENDER PAGE
  // -------------------------------------------------------

  const renderContent = () => {
    // Public informational pages.
    if (route === 'about') {
      return (
        <AboutUs onNavigate={handleFooterNavigate} />
      );
    }

    if (route === 'terms-conditions') {
      return <TermsConditions />;
    }

    if (route === 'privacy-policy') {
      return <PrivacyPolicy />;
    }

    // Login and registration.
    if (route === 'auth') {
      return (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      );
    }

    // Admin dashboard.
    if (route === 'admin') {
      if (user?.role === 'admin') {
        return (
          <AdminDashboardScreen
            user={user}
            onLogout={handleLogout}
          />
        );
      }

      return (
        <HomeScreen
          user={user}
          onLogout={handleLogout}
          onNavigateToLogin={openLogin}
          onSelectTurf={(turf: any) => {
            setSelectedTurf(turf);
            navigateTo('turfDetails');
          }}
          onNavigateToNotifications={() =>
            requireLogin(
              () => navigateTo('notifications'),
              'notifications',
            )
          }
          onNavigateToSaved={() =>
            requireLogin(
              () => navigateTo('savedTurfs'),
              'savedTurfs',
            )
          }
          onNavigateToProfile={() =>
            requireLogin(
              () => navigateTo('profile'),
              'profile',
            )
          }
          onNavigateToOwnerProfile={() =>
            requireLogin(
              () => navigateTo('ownerProfile'),
              'ownerProfile',
            )
          }
          onNavigateToOwnerDashboard={() =>
            requireLogin(
              () => navigateTo('owner'),
              'owner',
            )
          }
          onNavigateToAddTurf={() =>
            requireLogin(
              () => navigateTo('addTurf'),
              'addTurf',
            )
          }
        />
      );
    }

    // Owner dashboard.
    if (route === 'owner') {
      if (!user) {
        return null;
      }

      if (user.role !== 'owner') {
        return (
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            onNavigateToLogin={openLogin}
            onSelectTurf={(turf: any) => {
              setSelectedTurf(turf);
              navigateTo('turfDetails');
            }}
            onNavigateToNotifications={() =>
              requireLogin(
                () => navigateTo('notifications'),
                'notifications',
              )
            }
            onNavigateToSaved={() =>
              requireLogin(
                () => navigateTo('savedTurfs'),
                'savedTurfs',
              )
            }
            onNavigateToProfile={() =>
              requireLogin(
                () => navigateTo('profile'),
                'profile',
              )
            }
            onNavigateToOwnerProfile={() =>
              requireLogin(
                () => navigateTo('ownerProfile'),
                'ownerProfile',
              )
            }
            onNavigateToOwnerDashboard={() =>
              requireLogin(
                () => navigateTo('owner'),
                'owner',
              )
            }
            onNavigateToAddTurf={() =>
              requireLogin(
                () => navigateTo('addTurf'),
                'addTurf',
              )
            }
          />
        );
      }

      return (
        <OwnerDashboardScreen
          user={user}
          onAddTurf={() => navigateTo('addTurf')}
          onManageCourts={() => navigateTo('ownerProfile')}
          onManageSlots={() => navigateTo('ownerProfile')}
          onViewBookings={() => navigateTo('ownerProfile')}
        />
      );
    }

    // Owner profile and turf management.
    if (route === 'ownerProfile') {
      if (!user) {
        return null;
      }

      if (user.role !== 'owner') {
        return null;
      }

      return (
        <OwnerProfileScreen
          user={{
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: 'owner',
          }}
          onUpdateUser={(updatedUser) => {
            const mergedUser = {
              ...user,
              ...updatedUser,
            };

            setUser(mergedUser);

            try {
              localStorage.setItem(
                USER_STORAGE_KEY,
                JSON.stringify(mergedUser),
              );
            } catch (error) {
              console.error('Failed to update stored user:', error);
            }
          }}
          onLogout={handleLogout}
          onNavigateToAddTurf={() => navigateTo('addTurf')}
        />
      );
    }

    // Add turf.
    if (route === 'addTurf') {
      if (!user) {
        return null;
      }

      if (user.role !== 'owner') {
        return null;
      }

      return (
        <AddTurfScreen
          user={user}
          onBack={handleAddTurfSkip}
          onComplete={handleAddTurfComplete}
          onSkip={handleAddTurfSkip}
          onNavigateAddCourt={handleNavigateAddCourt}
        />
      );
    }

    // Customer profile.
    if (route === 'profile') {
      if (!user) {
        return null;
      }

      if (user.role !== 'customer') {
        return null;
      }

      return (
        <CustomerProfileScreen
          user={{
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: 'customer',
          }}
          onUpdateUser={(updatedUser) => {
            const mergedUser = {
              ...user,
              ...updatedUser,
            };

            setUser(mergedUser);

            try {
              localStorage.setItem(
                USER_STORAGE_KEY,
                JSON.stringify(mergedUser),
              );
            } catch (error) {
              console.error('Failed to update stored user:', error);
            }
          }}
          onLogout={handleLogout}
        />
      );
    }

    // Notifications.
    if (route === 'notifications') {
      if (!user) {
        return null;
      }

      return <NotificationsScreen userId={user._id} />;
    }

    // Saved turfs.
    if (route === 'savedTurfs') {
      if (!user) {
        return null;
      }

      return (
        <SavedTurfsScreen
          turfs={[]}
          likedTurfs={[]}
          onSelectTurf={(turf) => {
            setSelectedTurf(turf);
            navigateTo('turfDetails');
          }}
          onToggleLike={() => {}}
        />
      );
    }

    // Turf details are available without logging in.
    if (route === 'turfDetails' && selectedTurf) {
      return (
        <TurfDetailsScreen
          turf={selectedTurf}
          onBack={handleBack}
          onBook={(turf) => {
            setSelectedTurf(turf);

            requireLogin(
              () => navigateTo('slot'),
              'slot',
            );
          }}
        />
      );
    }

    // Slot selection.
    if (route === 'slot' && selectedTurf) {
      if (!user) {
        return null;
      }

      return (
        <SlotScreen
          turf={selectedTurf}
          onBack={handleBack}
          onContinueToPayment={(payload) => {
            setSlotSelection(payload);
            navigateTo('payment');
          }}
        />
      );
    }

    // Payment.
    if (route === 'payment' && slotSelection) {
      if (!user) {
        return null;
      }

      return (
        <PaymentScreen
          turf={slotSelection.turf}
          court={slotSelection.court}
          turfId={slotSelection.turf._id}
          courtId={slotSelection.court._id}
          bookings={slotSelection.bookings}
          totalAmount={slotSelection.totalAmount}
          onBack={handleBack}
          onSuccess={() => {
            setSlotSelection(null);
            navigateTo('home');
          }}
        />
      );
    }

    // Default page: Home.
    return (
      <HomeScreen
        user={user}
        onLogout={handleLogout}
        onNavigateToLogin={openLogin}
        onSelectTurf={(turf: any) => {
          setSelectedTurf(turf);
          navigateTo('turfDetails');
        }}
        onNavigateToNotifications={() =>
          requireLogin(
            () => navigateTo('notifications'),
            'notifications',
          )
        }
        onNavigateToSaved={() =>
          requireLogin(
            () => navigateTo('savedTurfs'),
            'savedTurfs',
          )
        }
        onNavigateToProfile={() =>
          requireLogin(
            () => navigateTo('profile'),
            'profile',
          )
        }
        onNavigateToOwnerProfile={() =>
          requireLogin(
            () => navigateTo('ownerProfile'),
            'ownerProfile',
          )
        }
        onNavigateToOwnerDashboard={() =>
          requireLogin(
            () => navigateTo('owner'),
            'owner',
          )
        }
        onNavigateToAddTurf={() =>
          requireLogin(
            () => navigateTo('addTurf'),
            'addTurf',
          )
        }
      />
    );
  };

  // -------------------------------------------------------
  // SESSION LOADING
  // -------------------------------------------------------

  if (isLoadingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          background: '#F7F8FC',
        }}
        aria-label="Loading TurfBooking"
      />
    );
  }

  // -------------------------------------------------------
  // APP LAYOUT
  // -------------------------------------------------------

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#F7F8FC',
      }}
    >
      {renderContent()}

      {/* Footer appears only on the Home page. */}
      {route === 'home' && (
        <SiteFooter onNavigate={handleFooterNavigate} />
      )}

      {/* Login-required modal. */}
      {showLoginModal && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              cancelLogin();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 18, 32, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-required-title"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 30,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#F4FBE6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 28,
              }}
            >
              🔒
            </div>

            <h2
              id="login-required-title"
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0B1220',
                margin: '0 0 12px',
              }}
            >
              Login Required
            </h2>

            <p
              style={{
                fontSize: 15,
                color: '#5E6677',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}
            >
              Please log in or create an account to continue
              to this section of TurfBooking.
            </p>

            <button
              type="button"
              onClick={cancelLogin}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                backgroundColor: '#F1F3F8',
                color: '#5E6677',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={openLogin}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                backgroundColor: '#C7F36B',
                color: '#0B1220',
                fontSize: 15,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(135,185,54,0.2)',
                fontFamily: 'inherit',
              }}
            >
              LOGIN NOW
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
