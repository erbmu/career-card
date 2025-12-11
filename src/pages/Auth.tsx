import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as { from?: string })?.from || "/dashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, loading, navigate, redirectPath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast.success("Logged in successfully!");
      } else {
        await signup(email.trim(), password, firstName.trim(), lastName.trim());
        toast.success("Account created and logged in!");
      }
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to authenticate";
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f0ff] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl font-semibold tracking-tight text-[#3b1d8d]">
            Recrio <span className="text-[#b6a4f7] font-normal">— Career Cards</span>
          </p>
          <p className="text-sm text-[#5f35c5] mt-3">
            {isLogin ? "Access your saved cards in seconds." : "Create your profile in a couple of clicks."}
          </p>
        </div>
        <div className="rounded-[32px] border border-[#e0d4ff] bg-white shadow-[0_30px_80px_rgba(60,7,112,0.12)] p-8">
          <div className="text-center space-y-1 mb-6">
            <p className="text-2xl font-semibold text-[#2a0d68]">
              {isLogin ? "Sign in to Career Card" : "Create your account"}
            </p>
            <p className="text-sm text-[#6b4ccc]">
              {isLogin ? "Use your Recrio credentials to continue." : "A few details and you're in."}
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium text-[#4a2da5]">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                    placeholder="Alex"
                    className="h-11 rounded-2xl border-[#e0d4ff] text-base placeholder:text-[#c0b2ef] focus-visible:ring-[#7c4dff]/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium text-[#4a2da5]">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                    placeholder="Morgan"
                    className="h-11 rounded-2xl border-[#e0d4ff] text-base placeholder:text-[#c0b2ef] focus-visible:ring-[#7c4dff]/30"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#4a2da5]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-11 rounded-2xl border-[#e0d4ff] text-base placeholder:text-[#c0b2ef] focus-visible:ring-[#7c4dff]/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-[#4a2da5]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="h-11 rounded-2xl border-[#e0d4ff] text-base placeholder:text-[#c0b2ef] focus-visible:ring-[#7c4dff]/30"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-full bg-[#7c4dff] text-white text-sm font-semibold tracking-wide hover:bg-[#6a3ee6] transition-colors"
              disabled={pending || loading}
            >
              {pending ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <p className="text-center text-sm text-[#6b4ccc] mt-8">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-[#4a2da5] hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
