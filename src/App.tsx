import { useState, useEffect, useCallback } from 'react';
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

type Route = 'auth' | 'home' | 'admin' | 'owner' | 'ownerProfile' | 'addTurf' | 'profile' | 'notifications' | 'savedTurfs' | 'turfDetails' | 'slot' | 'payment';

const USER_STORAGE_KEY = '@user_data';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [route, setRoute] = useState<Route>('home');
  const [selectedTurf, setSelectedTurf] = useState<any>(null);
  const [slotSelection, setSlotSelection] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [redirectTo, setRedirectTo] = useState<Route | null>(null);
  
  // ✅ 1. State to control the custom modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUser(parsed);
      }
    } catch (error) {
      console.error('Failed to load session', error);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (isLoadingSession) return;
    window.history.pushState({ route }, '', `#${route}`);
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.route) setRoute(event.state.route);
      else setRoute('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [route, isLoadingSession]);

  const handleBack = useCallback(() => { window.history.back(); }, []);

  const handleAuthSuccess = (u: AuthUser) => { 
    setUser(u); 
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    
    if (redirectTo) {
      setRoute(redirectTo);
      setRedirectTo(null);
    } else {
      setRoute(u.role === 'admin' ? 'admin' : 'home'); 
    }
  };
  
  const handleLogout = () => { 
    setUser(null); 
    localStorage.removeItem(USER_STORAGE_KEY);
    setRoute('home'); 
  };

  // ✅ 2. Show custom modal instead of window.alert
  const requireLogin = (action?: () => void, destination?: Route) => {
    if (!user) { 
      if (destination) setRedirectTo(destination);
      setShowLoginModal(true); // Open the beautiful modal
    } else if (action) { 
      action(); 
    }
  };

  const renderContent = () => {
    if (route === 'auth') return <AuthScreen onAuthSuccess={handleAuthSuccess} />;

    if (user) {
      if (route === 'admin') return <AdminDashboardScreen user={user} onLogout={handleLogout} />;
      if (route === 'owner') return <OwnerDashboardScreen user={user} onAddTurf={() => setRoute('addTurf')} onManageCourts={() => setRoute('ownerProfile')} onManageSlots={() => console.log('slots')} onViewBookings={() => setRoute('ownerProfile')} />;
      if (route === 'ownerProfile') return <OwnerProfileScreen user={{ _id: user._id, name: user.name, email: user.email, phone: user.phone || '', role: 'owner' }} onUpdateUser={(u) => setUser({ ...user, ...u })} onLogout={handleLogout} onNavigateToAddTurf={() => setRoute('addTurf')} />;
      if (route === 'addTurf') return <AddTurfScreen user={user} onBack={handleBack} onNavigateAddCourt={(payload: AddTurfPayload) => { console.log('Add court', payload); setRoute('ownerProfile'); }} />;
      if (route === 'profile' && user.role === 'customer') return <CustomerProfileScreen user={{ _id: user._id, name: user.name, email: user.email, phone: user.phone || '', role: 'customer' }} onUpdateUser={(u) => setUser({ ...user, ...u })} onLogout={handleLogout} />;
      if (route === 'notifications') return <NotificationsScreen userId={user._id} />;
      if (route === 'savedTurfs') return <SavedTurfsScreen turfs={[]} likedTurfs={[]} onSelectTurf={(t) => { setSelectedTurf(t); setRoute('turfDetails'); }} onToggleLike={() => {}} />;
      if (route === 'payment' && slotSelection) return <PaymentScreen turf={slotSelection.turf} court={slotSelection.court} turfId={slotSelection.turf._id} courtId={slotSelection.court._id} bookings={slotSelection.bookings} totalAmount={slotSelection.totalAmount} onBack={handleBack} onSuccess={() => setRoute('home')} />;
    }

    if (route === 'turfDetails' && selectedTurf) return (
      <TurfDetailsScreen 
        turf={selectedTurf} 
        onBack={handleBack} 
        onBook={(t) => { 
          requireLogin(() => { setSelectedTurf(t); setRoute('slot'); }, 'slot'); 
        }} 
      />
    );
    
    if (route === 'slot' && selectedTurf && user) return <SlotScreen turf={selectedTurf} onBack={handleBack} onContinueToPayment={(payload) => { setSlotSelection(payload); setRoute('payment'); }} />;

    if (route === 'slot' && selectedTurf && !user) {
       setRoute('auth');
       return null;
    }

    return (
      <HomeScreen
        user={user}
        onLogout={handleLogout}
        onNavigateToLogin={() => setRoute('auth')} 
        onSelectTurf={(t: any) => { setSelectedTurf(t); setRoute('turfDetails'); }}
        onNavigateToNotifications={() => requireLogin(() => setRoute('notifications'), 'notifications')}
        onNavigateToSaved={() => requireLogin(() => setRoute('savedTurfs'), 'savedTurfs')}
        onNavigateToProfile={() => requireLogin(() => setRoute('profile'), 'profile')}
        onNavigateToOwnerProfile={() => requireLogin(() => setRoute('ownerProfile'), 'ownerProfile')}
        onNavigateToOwnerDashboard={() => requireLogin(() => setRoute('owner'), 'owner')}
        onNavigateToAddTurf={() => requireLogin(() => setRoute('addTurf'), 'addTurf')}
      />
    );
  };

  if (isLoadingSession) {
    return <div style={{ minHeight: '100vh', background: '#F7F8FC' }} />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F7F8FC' }}>
      {renderContent()}

      {/* ✅ 3. The Custom Login Modal */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11, 18, 32, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '30px',
            maxWidth: '400px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#F4FBE6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '28px'
            }}>
              🔒
            </div>
            
            {/* Text */}
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0B1220', margin: '0 0 12px' }}>
              Login Required
            </h2>
            <p style={{ fontSize: '15px', color: '#5E6677', margin: '0 0 24px', lineHeight: 1.5 }}>
              Please login or create an account to book your slot and continue.
            </p>

            {/* Buttons */}
            <button 
              onClick={() => setShowLoginModal(false)}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                backgroundColor: '#F1F3F8', color: '#5E6677', fontSize: '15px',
                fontWeight: 800, cursor: 'pointer', marginBottom: '12px', fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={() => { setShowLoginModal(false); setRoute('auth'); }}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                backgroundColor: '#C7F36B', color: '#0B1220', fontSize: '15px',
                fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(135,185,54,0.2)',
                fontFamily: 'inherit'
              }}
            >
              LOGIN NOW
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animation for the modal */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}