import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  ShieldCheck, 
  Database, 
  KeyRound, 
  Server, 
  Check, 
  Copy, 
  ExternalLink,
  Flame
} from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default Deny Catch-All
    match /{document=**} {
      allow read, write: if false;
    }

    // WinterBuild APK Applications
    match /apps/{appId} {
      // Public visitors can read apps
      allow read: if true;
      // Only authenticated admin can create, update, delete
      allow write: if request.auth != null && 
        request.auth.token.email_verified == true &&
        request.auth.token.email == "owner@yourdomain.com";
    }
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#281e16]/65 backdrop-blur-sm overflow-y-auto">
      <div 
        id="modal-setup-deployment-guide"
        className="relative w-full max-w-3xl my-8 bg-[#ffffff] border border-[#ded5c5] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#281e16]"
      >
        {/* Close Button */}
        <button
          id="btn-close-setup-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#7d6c5d] hover:text-[#281e16] hover:bg-[#f5efe4] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#ede5d8] pb-5">
          <div className="w-10 h-10 rounded-xl bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center text-[#6b4423]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#281e16]">
              WinterBuild Setup & Settings Guide
            </h2>
            <p className="text-xs text-[#6e5d4f]">
              Simple steps to change your password, connect a database, and manage your website.
            </p>
          </div>
        </div>

        {/* Current Working Status */}
        <div className="p-4 rounded-xl bg-[#edf4ee] border border-[#cbe0ce] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#2d5c37] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-[#2d5c37]">
              Website Status: Working & Ready
            </p>
            <p className="text-[#435e49] leading-relaxed">
              WinterBuild is currently running and saving your apps in local storage. 
              Apps are saved in <code className="bg-white/80 px-1 py-0.5 rounded border border-[#cbe0ce] text-[#2d5c37] font-semibold">data/apps.json</code>, and uploaded app files and pictures are kept safely in <code className="bg-white/80 px-1 py-0.5 rounded border border-[#cbe0ce] text-[#2d5c37] font-semibold">uploads/</code>. All pages and downloads are fully working.
            </p>
          </div>
        </div>

        {/* Section 1: Admin Password Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#4d3c2e] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#7c4d29]" />
            1. Your Admin Password
          </h3>
          <p className="text-xs text-[#6e5d4f] leading-relaxed">
            You can protect your website manager with your own secret password. You can set it in your <code className="text-[#382b20] font-semibold">.env</code> file or right on the login screen:
          </p>
          <div className="relative rounded-xl bg-[#f8f4ec] border border-[#e2d8c7] p-4 font-mono text-xs text-[#382b20]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-[#7d6c5d]">.env</span>
              <button
                onClick={() => handleCopy('ADMIN_PASSWORD="ChooseYourSecretPassphraseHere"', 'env')}
                className="text-xs text-[#7c4d29] hover:text-[#5e381b] flex items-center gap-1 font-sans"
              >
                {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-[#2d5c37]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'env' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <code>ADMIN_PASSWORD="ChooseYourSecretPassphraseHere"</code>
          </div>
          <p className="text-[11px] text-[#7d6c5d]">
            * If you don't set a password in <code className="text-[#4d3c2e] font-semibold">.env</code>, WinterBuild will simply ask you to choose a password the first time you visit the Manage Website page.
          </p>
        </div>

        {/* Section 2: Optional Firebase Firestore & Cloud Storage Setup */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#4d3c2e] flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#995f2d]" />
            2. Optional Cloud Database (Firebase)
          </h3>
          <p className="text-xs text-[#6e5d4f] leading-relaxed">
            If you want to store your apps in Google Cloud Firebase instead of local files:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#4d3c2e] pl-1">
            <li>Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-[#7c4d29] hover:underline font-semibold">Firebase Console</a> and create a project.</li>
            <li>Turn on <strong>Cloud Firestore</strong> database.</li>
            <li>Turn on <strong>Firebase Authentication</strong> (Email & Password or Google sign-in).</li>
            <li>Paste these simple security rules to keep your app list safe:</li>
          </ol>

          <div className="relative rounded-xl bg-[#f8f4ec] border border-[#e2d8c7] p-4 font-mono text-[11px] text-[#382b20]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-[#7d6c5d]">firestore.rules</span>
              <button
                onClick={() => handleCopy(sampleRules, 'rules')}
                className="text-xs text-[#7c4d29] hover:text-[#5e381b] flex items-center gap-1 font-sans"
              >
                {copiedKey === 'rules' ? <Check className="w-3.5 h-3.5 text-[#2d5c37]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'rules' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[#382b20] whitespace-pre">{sampleRules}</pre>
          </div>
        </div>

        {/* Section 3: APK Storage & Direct Downloads */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#4d3c2e] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#7c4d29]" />
            3. Adding Apps & Files
          </h3>
          <p className="text-xs text-[#6e5d4f] leading-relaxed">
            When you add an app to your website, you have two easy choices:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-[#4d3c2e] pl-1">
            <li>Upload real Android app files (<code className="text-[#6b4423] font-mono font-semibold">.apk</code>) directly from your computer. The safety code is calculated automatically.</li>
            <li>Or paste a direct download web link (like GitHub or cloud storage).</li>
          </ul>
        </div>

        {/* Modal Action */}
        <div className="flex justify-end pt-4 border-t border-[#ede5d8]">
          <button
            id="btn-dismiss-setup-modal"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] text-xs font-semibold transition-all shadow-xs"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
