import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Rabbit, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { signup as apiSignup } from "@/lib/api";

const LOGIN_BG =
  "https://images.unsplash.com/photo-1623039405147-547794f92e9e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxlZGl0b3JpYWwlMjBuZXdzJTIwcGhvdG9ncmFwaHl8ZW58MHx8fHwxNzg4NjEzNTc4fDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const navigate = useNavigate();
  const { user, login, setSession } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate("/editor", { replace: true }); }, [user, navigate]);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const loginWithGoogle = () => {
    const redirectUrl = window.location.origin + "/editor";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const data = await apiSignup({ name, email, password });
        setSession(data);
        toast.success(`Welcome, ${data.user.name}`);
      } else {
        await login(email, password);
      }
      navigate("/editor", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || (mode === "signup" ? "Could not sign up" : "Invalid credentials"));
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen font-plex">
      <div className="relative hidden w-1/2 lg:block">
        <img src={LOGIN_BG} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#0A0A0A]/45" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/70">The Rabbit Hole · Newsroom</p>
          <h2 className="mt-3 font-editorial text-4xl font-bold leading-tight tracking-tight">Every insight, written by a human.</h2>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#F8F9FA] px-6 lg:w-1/2">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0A0A0A] text-white"><Rabbit className="h-5 w-5" /></div>
            <span className="text-lg font-bold tracking-tight">Editor Studio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{isSignup ? "Create your account" : "Sign in"}</h1>
          <p className="mt-1 mb-6 text-sm text-[#71717A]">{isSignup ? "Quick signup — you'll be remembered next time." : "Access the content tree builder."}</p>

          {isSignup && (
            <>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-[#71717A]">Name</label>
              <input data-testid="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="mb-4 w-full rounded-md border border-[#E4E4E7] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />
            </>
          )}

          <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-[#71717A]">Email</label>
          <input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mb-4 w-full rounded-md border border-[#E4E4E7] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />

          <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-[#71717A]">Password</label>
          <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mb-6 w-full rounded-md border border-[#E4E4E7] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A0A0A]" />

          <button data-testid="login-submit" type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {isSignup ? "Sign up" : "Sign in"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E4E4E7]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A1A1AA]">or</span>
            <div className="h-px flex-1 bg-[#E4E4E7]" />
          </div>

          <button data-testid="google-login-btn" type="button" onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-[#E4E4E7] bg-white py-3 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F4F4F5]">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-4 w-4" />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-[#71717A]">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button type="button" data-testid="toggle-auth-mode" onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="font-semibold text-[#0A0A0A] underline underline-offset-2">
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="mt-3 text-center text-xs text-[#A1A1AA]">Internal tool for editors &amp; journalists only.</p>
        </form>
      </div>
    </div>
  );
}
