import React, { useState, useEffect } from 'react';
import { api, setLocalAuthToken } from '../services/api';
import { getSupabaseClient } from '../lib/supabase';
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('winterbuilds99@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAdminEmail();
  }, []);

  const loadAdminEmail = async () => {
    try {
      const status = await api.checkAdminStatus();
      if (status.email) {
        setEmail(status.email);
      } else if (status.defaultAdminEmail) {
        setEmail(status.defaultAdminEmail);
      }
    } catch {
      // Keep default
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. If Supabase Auth is configured, attempt Supabase sign in first
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (!error && data?.session?.access_token) {
            setLocalAuthToken(data.session.access_token);
            setSuccessMessage('Welcome back! Redirecting to admin dashboard...');
            setTimeout(() => {
              onLoginSuccess();
            }, 400);
            return;
          }
        } catch {
          // Proceed to backend admin login
        }
      }

      // 2. Validate against ADMIN_PASSWORD environment variable via /api/admin/login
      const res = await api.adminLogin({
        email: email.trim(),
        password,
      });

      if (res?.token) {
        setLocalAuthToken(res.token);
        setSuccessMessage('Authentication successful! Opening Admin Hub...');
        setTimeout(() => {
          onLoginSuccess();
        }, 400);
        return;
      }

      setErrorMessage('Unexpected response during sign in. Please try again.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-3xl p-8 border shadow-xl bg-[#ffffff] border-[#e2d8c3] text-[#1c1713] dark:bg-[#181614] dark:border-[#27231e] dark:text-[#f8f5ee]">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-bold text-lg bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50 shadow-md shadow-amber-900/10">
            <span>W</span>
            <span className="text-amber-300 text-xs ml-0.5 font-mono">B</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">
            Administrator Sign In
          </h1>
          <p className="text-xs text-[#716353] dark:text-[#908475]">
            Enter your administrator credentials to access WinterBuilds management
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[#4d4032] dark:text-[#c4b7a6]">
              Authorized Admin Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-[#8a7c6c] dark:text-[#887c6e]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                placeholder="winterbuilds99@gmail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#4d4032] dark:text-[#c4b7a6]">
              Admin Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[#8a7c6c] dark:text-[#887c6e]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#8a7c6c] hover:text-[#4d4032] dark:text-[#887c6e] dark:hover:text-[#f8f5ee]"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#716353] dark:text-[#8e8373]">
              Admin password is strictly controlled via the server environment key <span className="font-mono text-amber-700 dark:text-amber-400">ADMIN_PASSWORD</span>.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-amber-900/20 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In as Administrator</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Actions */}
        <div className="mt-6 pt-6 border-t border-[#ede3d1] dark:border-[#28241e] space-y-3 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#716353] dark:text-[#8a7e71] hover:underline"
          >
            Return to Public Catalog
          </button>
        </div>
      </div>
    </div>
  );
};
