import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PublicDashboard from "./pages/PublicDashboard";
import Categories from "./pages/Categories";
import Watchlist from "./pages/Watchlist";
import CardDetail from "./pages/CardDetail";
import Templates from "./pages/Templates";
import Tasks from "./pages/Tasks";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/public" component={PublicDashboard} />
      <Route path="/categories" component={Categories} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/card/:cardId">
        {(params) => <CardDetail cardId={params.cardId} />}
      </Route>
      <Route path="/templates" component={Templates} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
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
