import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/editor/login" replace />;
  return children;
}
