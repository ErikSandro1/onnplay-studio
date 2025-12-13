import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import RemoteControl from "./pages/RemoteControl";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

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
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      
      {/* Protected routes - require authentication */}
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
        <ProtectedRoute requiredRole="admin">
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/remote">
        <ProtectedRoute requiredRole="operator">
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
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
