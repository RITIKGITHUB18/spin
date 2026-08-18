import { AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SplashPage } from './pages/onboarding/SplashPage';
import { PhonePage } from './pages/onboarding/PhonePage';
import { OtpPage } from './pages/onboarding/OtpPage';
import { NamePage } from './pages/onboarding/NamePage';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/app/HomePage';
import { MyMachinePage } from './pages/app/MyMachinePage';
import { ProfilePage } from './pages/app/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PageTransition } from './components/layout/PageTransition';

function App() {
  const location = useLocation();

  // Every /app/* route shares one key so AppShell survives tab changes with its
  // queries and sheet state intact; its own Outlet animates the tabs instead.
  const routeKey = location.pathname.startsWith('/app') ? '/app' : location.pathname;

  return (
    // The app is a phone-sized PWA, so it is held to one column and centred.
    // Without this it stretched to the full desktop width: cards ran edge to
    // edge and the sky's noise was smeared across ~3000px into flat bands.
    // overflow-hidden also clips pages while they sit off-screen mid-transition.
    <div className="min-h-svh bg-cream-150">
      {/* relative: the positioning context the overlapping pages are laid out in. */}
      <div className="relative mx-auto min-h-svh w-full max-w-md overflow-hidden bg-cream-50">
        {/* Default (sync) mode keeps both pages mounted, so the outgoing one
            stays visible until the incoming has slid fully into place. */}
        <AnimatePresence initial={false}>
        <Routes location={location} key={routeKey}>
          <Route path="/" element={<PageTransition><SplashPage /></PageTransition>} />
          <Route path="/phone" element={<PageTransition><PhonePage /></PageTransition>} />
          <Route path="/otp" element={<PageTransition><OtpPage /></PageTransition>} />
          <Route path="/name" element={<PageTransition><NamePage /></PageTransition>} />
          {/* AppShell is deliberately unwrapped — it owns the fixed nav, sheets
              and toasts, which a transformed ancestor would break. */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="mine" element={<MyMachinePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
            <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
