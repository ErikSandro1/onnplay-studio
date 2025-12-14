import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import RemoteControl from "./pages/RemoteControl";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import LoginNew from "./pages/LoginNew";
import Pricing from "./pages/Pricing";
import Landing from "./pages/Landing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailVerified from "./pages/EmailVerified";

/**
 * OnnPlay Studio - Main Application Router
 * 
 * Design: Cinematic Dark Pro
 * - Dark theme enabled by default for broadcast studio environment
 * - All colors defined in index.css with professional broadcast palette
 * 
 * Roles:
 * - admin: Full access to all features, can manage users and settings
 * - operator: Can control the studio, switch cameras, manage audio
 * - moderator: Can moderate chat, manage participants
 * - user: Basic viewer access
 */
function Router() {
  // Don't handle API routes - let them go to the backend
  if (window.location.pathname.startsWith('/api/')) {
    return null;
  }
  
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/login-new" component={LoginNew} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/email-verified" component={EmailVerified} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/home" component={Landing} />
      
      {/* Protected routes - Require authentication */}
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      
      <Route path="/studio">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/analytics">
        <ProtectedRoute>
          <DashboardAnalytics />
        </ProtectedRoute>
      </Route>
      
      <Route path="/remote">
        <ProtectedRoute>
          <RemoteControl />
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="dark"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
