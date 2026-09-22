import React from 'react';
import { ShieldCheck, HardDrive, Cpu, Terminal, Sparkles, CheckCircle2, Lock } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1c1713] dark:text-[#f8f5ee]">
          About WinterBuilds
        </h1>
        <p className="text-sm text-[#736555] dark:text-[#918575] mt-2">
          An open, verified Android APK distribution hub engineered for speed, direct object storage delivery, and binary integrity.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div className="rounded-3xl p-8 border space-y-6 bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e]">
        <h2 className="text-xl font-bold text-[#1c1713] dark:text-[#f8f5ee] flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Direct-to-Storage Architecture</span>
        </h2>

        <p className="text-sm leading-relaxed text-[#594d40] dark:text-[#9c9183]">
          Unlike traditional APK hosting websites that rely on slow redirect pages, nested countdown timers, and proxy servers that crash under 100MB+ APK uploads, WinterBuilds connects the administrator’s browser directly to cloud object storage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl border bg-[#fbf7ef] border-[#ded4c3] dark:bg-[#1c1a17] dark:border-[#2e2a24]">
            <h3 className="font-bold text-sm text-[#1c1713] dark:text-[#f8f5ee] mb-1">
              Zero Server-Memory Bottlenecks
            </h3>
            <p className="text-xs text-[#6e6051] dark:text-[#8e8374] leading-relaxed">
              Uploads bypass standard HTTP server body limits by acquiring pre-authorized storage tokens and streaming directly via multi-part upload protocols.
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-[#fbf7ef] border-[#ded4c3] dark:bg-[#1c1a17] dark:border-[#2e2a24]">
            <h3 className="font-bold text-sm text-[#1c1713] dark:text-[#f8f5ee] mb-1">
              Vercel Serverless Ready
            </h3>
            <p className="text-xs text-[#6e6051] dark:text-[#8e8374] leading-relaxed">
              The API layer is packaged for Vercel Serverless Functions and standalone Node.js runtimes without stateful file locks.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Cryptography */}
      <div className="rounded-3xl p-8 border space-y-6 bg-[#ffffff] border-[#e2d8c3] dark:bg-[#181614] dark:border-[#27231e]">
        <h2 className="text-xl font-bold text-[#1c1713] dark:text-[#f8f5ee] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Cryptographic Package Verification</span>
        </h2>

        <p className="text-sm leading-relaxed text-[#594d40] dark:text-[#9c9183]">
          Every Android APK uploaded to WinterBuilds is scanned by our client-side APK metadata extractor. We inspect the binary <code className="font-mono text-xs bg-[#eee4d2] dark:bg-[#25221d] px-1.5 py-0.5 rounded">AndroidManifest.xml</code> string pool to extract genuine package names, version names, version codes, and compute a cryptographic SHA-256 digest.
        </p>

        <div className="p-4 rounded-2xl border font-mono text-xs space-y-2 bg-[#f7f0e4] border-[#dcd0bb] dark:bg-[#151311] dark:border-[#28241e] text-[#4d4032] dark:text-[#cfc3b2]">
          <div className="text-[11px] text-[#807261] dark:text-[#877c6e]">
            # Verify any downloaded WinterBuilds APK in your local terminal:
          </div>
          <div className="text-amber-700 dark:text-amber-400">
            sha256sum application-release.apk
          </div>
        </div>
      </div>

      {/* Administrator Contact */}
      <div className="rounded-3xl p-6 border flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8f2e7] border-[#e2d8c3] dark:bg-[#191714] dark:border-[#28231d]">
        <div>
          <h3 className="font-bold text-base text-[#1c1713] dark:text-[#f8f5ee]">
            Administrator & Curator
          </h3>
          <p className="text-xs text-[#6e6051] dark:text-[#8e8374]">
            Managed and published by <span className="font-mono font-semibold">winterbuilds99@gmail.com</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 text-white dark:bg-amber-500 dark:text-neutral-950">
          Curated Hub
        </div>
      </div>
    </div>
  );
};
