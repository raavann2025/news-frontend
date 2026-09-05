import "@/App.css";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { googleSession } from "@/lib/api";

// Consumer
import Landing from "@/pages/Landing";
import Directions from "@/pages/Directions";
import Feed from "@/pages/Feed";
import Preview from "@/pages/Preview";
// Editor Studio (internal)
import Login from "@/pages/editor/Login";
import Dashboard from "@/pages/editor/Dashboard";
import TreeBuilder from "@/pages/editor/TreeBuilder";
import Community from "@/pages/editor/Community";
import Editors from "@/pages/editor/Editors";

/* ===== Google OAuth callback — exchanges #session_id for our JWT ===== */
function AuthCallback() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const sid = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    window.history.replaceState(null, "", window.location.pathname);
    if (!sid) { navigate("/editor/login", { replace: true }); return; }
    googleSession(sid)
      .then((data) => { setSession(data); navigate("/editor", { replace: true }); })
      .catch(() => navigate("/editor/login?error=google", { replace: true }));
  }, [navigate, setSession]);
  return (
    <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
      <Loader2 className="h-6 w-6 animate-spin text-[#0A0A0A]" />
    </div>
  );
}

/* ===== Router — detect the OAuth callback synchronously during render ===== */
function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      {/* Consumer (mobile-first, public) */}
      <Route path="/" element={<Landing />} />
      <Route path="/directions" element={<Directions />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/preview" element={<Preview />} />

      {/* Editor Studio (internal, desktop) */}
      <Route path="/editor/login" element={<Login />} />
      <Route path="/editor" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/editor/story/:storyId" element={<ProtectedRoute><TreeBuilder /></ProtectedRoute>} />
      <Route path="/editor/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
      <Route path="/editor/team" element={<ProtectedRoute><Editors /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App min-h-[100dvh] bg-[#0C0C0D] text-[#F8F8F8]">
      <AuthProvider>
        <BrowserRouter>
          <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: "#121214", border: "1px solid rgba(255,255,255,0.1)", color: "#F8F8F8", fontFamily: "Manrope, sans-serif" } }} />
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
