import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Lock, 
  CheckCircle2, 
  Cpu, 
  Terminal, 
  HeartHandshake, 
  FileCheck2,
  Info
} from 'lucide-react';

interface AboutViewProps {
  onNavigate: (view: string) => void;
  onOpenDeployGuide: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate, onOpenDeployGuide }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24 text-[#4d3c2e]">
      
      {/* Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7c4d29]">
          <Info className="w-4 h-4" />
          <span>Our Mission</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#281e16] tracking-tight">
          About WinterBuild
        </h1>
        <p className="text-sm sm:text-base text-[#6e5d4f] max-w-2xl leading-relaxed">
          WinterBuild is a safe place to download Android apps. 
          We give you direct file downloads, check every app for safety, and keep things simple.
        </p>
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#ded5c5] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#f0e6d6] border border-[#d8c8b4] flex items-center justify-center text-[#7c4d29]">
            <Download className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#281e16]">Direct App Downloads</h2>
          <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed">
            Other websites often force you to install confusing extra downloaders or watch annoying ads. On WinterBuild, you get the real app file directly to your phone.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#ded5c5] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#edf4ee] border border-[#cbe0ce] flex items-center justify-center text-[#2d5c37]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#281e16]">Safety Tested</h2>
          <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed">
            Every app has a unique safety code. This makes sure the file you download is 100% safe and has not been changed by anyone.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#ded5c5] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#f5eee3] border border-[#e0d3c0] flex items-center justify-center text-[#6b4423]">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#281e16]">No Sign-Up Needed</h2>
          <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed">
            You do not need an account or email to download apps. You can search, browse, and download freely and privately.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#ded5c5] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#f7efe6] border border-[#dfcebf] flex items-center justify-center text-[#7a482b]">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#281e16]">Carefully Selected Apps</h2>
          <p className="text-xs sm:text-sm text-[#6e5d4f] leading-relaxed">
            The website owner checks every app before publishing it. We make sure each app works well on Android phones.
          </p>
        </div>

      </div>

      {/* Verification Pipeline */}
      <div className="rounded-2xl bg-[#ffffff] border border-[#ded5c5] p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="text-lg font-bold text-[#281e16] flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#7c4d29]" />
          How We Check Every App
        </h2>
        
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2d5c37] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#281e16]">Developer Signature Check</p>
              <p className="text-[#6e5d4f] text-xs mt-0.5">
                We check the maker's signature to make sure the app is real and untouched.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2d5c37] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#281e16]">Virus and Malware Scan</p>
              <p className="text-[#6e5d4f] text-xs mt-0.5">
                We scan files to ensure there are no viruses, scams, or hidden bad programs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2d5c37] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#281e16]">Safety Code (SHA-256)</p>
              <p className="text-[#6e5d4f] text-xs mt-0.5">
                A unique digital code is created so you can be confident your download is safe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-[#faf6f0] border border-[#ded5c5] shadow-xs">
        <div className="text-xs sm:text-sm text-[#4d3c2e]">
          <p className="font-bold text-[#281e16]">Are you an app creator?</p>
          <p className="text-[#6e5d4f] mt-0.5">Send us your app so we can add it to our website.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('contact')}
            className="px-4 py-2.5 rounded-xl bg-[#6b4423] hover:bg-[#543318] text-[#fdfcf9] font-semibold text-xs transition-all shadow-xs"
          >
            Contact Us
          </button>
          <button
            onClick={onOpenDeployGuide}
            className="px-4 py-2.5 rounded-xl bg-[#f5eee3] hover:bg-[#ebe2d4] text-[#4d3c2e] hover:text-[#281e16] border border-[#ded3c2] font-medium text-xs transition-all"
          >
            Setup Guide
          </button>
        </div>
      </div>

    </div>
  );
};
