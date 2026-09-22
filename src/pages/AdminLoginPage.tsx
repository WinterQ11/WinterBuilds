import React, { useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { setLocalAuthToken } from '../services/api';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('winterbuilds99@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'temp_password',
        });

        if (error) {
          // If password auth fails, let user know
          setErrorMessage(error.message || 'Invalid email or password.');
          setIsLoading(false);
          return;
        }

        if (data.session) {
          setLocalAuthToken(data.session.access_token);
          onLoginSuccess();
          return;
        }
      } catch (err: any) {
        console.warn('Supabase auth error:', err);
      }
    }

    // Fallback: If in local preview or Supabase not yet seeded, authorize authorized admin email
    if (email.toLowerCase().trim() === 'winterbuilds99@gmail.com') {
      const mockToken = `admin_${btoa(email)}_${Date.now()}`;
      setLocalAuthToken(mockToken);
      onLoginSuccess();
    } else {
      setErrorMessage("Access denied: Only winterbuilds99@gmail.com has administrator rights.");
      setIsLoading(false);
    }
  };

  const handleQuickPreviewLogin = () => {
    setEmail('winterbuilds99@gmail.com');
    const mockToken = `admin_${btoa('winterbuilds99@gmail.com')}_${Date.now()}`;
    setLocalAuthToken(mockToken);
    onLoginSuccess();
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-3xl p-8 border shadow-xl bg-[#ffffff] border-[#e2d8c3] text-[#1c1713] dark:bg-[#181614] dark:border-[#27231e] dark:text-[#f8f5ee]">
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-bold text-lg bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50">
            <span>W</span>
            <span className="text-amber-300 text-xs ml-0.5 font-mono">B</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Administrator Sign In
          </h1>
          <p className="text-xs text-[#716353] dark:text-[#908475]">
            Manage WinterBuilds APKs, upload releases, and publish updates
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[#4d4032] dark:text-[#c4b7a6]">
              Admin Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-[#8a7c6c] dark:text-[#887c6e]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                placeholder="winterbuilds99@gmail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#4d4032] dark:text-[#c4b7a6]">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[#8a7c6c] dark:text-[#887c6e]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[#faf6ee] border-[#ded4c3] text-[#1f1914] dark:bg-[#1a1815] dark:border-[#2b2721] dark:text-[#f8f5ee]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#ede3d1] dark:border-[#28241e] space-y-3 text-center">
          <button
            type="button"
            onClick={handleQuickPreviewLogin}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 bg-[#f4ede0] border-[#ded4c3] text-[#42362a] hover:bg-[#eadecb] dark:bg-[#1f1d1a] dark:border-[#2e2a24] dark:text-[#cfc3b3]"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Instant Preview Admin Access (winterbuilds99)</span>
          </button>

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
