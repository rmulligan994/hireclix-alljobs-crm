import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import TalentPool from "./pages/TalentPool";
import TalentPools from "./pages/TalentPools";
import TalentPoolDetail from "./pages/TalentPoolDetail";
import CandidateProfile from "./pages/CandidateProfile";
import Pipelines from "./pages/Pipelines";
import PipelineDetail from "./pages/PipelineDetail";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/talent" element={<ProtectedRoute><TalentPool /></ProtectedRoute>} />
            <Route path="/talent/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/candidates/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/talent-pools" element={<ProtectedRoute><TalentPools /></ProtectedRoute>} />
            <Route path="/talent-pools/:id" element={<ProtectedRoute><TalentPoolDetail /></ProtectedRoute>} />
            <Route path="/pipelines" element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
            <Route path="/pipelines/:id" element={<ProtectedRoute><PipelineDetail /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
