import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  ShieldCheck, 
  FileCode 
} from 'lucide-react';
import { submitContact } from '../api';

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ type: 'error', text: 'Please fill in your name, email, and message.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await submitContact({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
      });
      setStatus({
        type: 'success',
        text: res.message || 'Thank you! Your message has been sent.',
      });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setStatus({
        type: 'error',
        text: err.message || 'Sorry, your message could not be sent. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24">
      
      {/* Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7c4d29]">
          <Mail className="w-4 h-4" />
          <span>Get in Touch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#281e16] tracking-tight">
          Contact Us & Submit Apps
        </h1>
        <p className="text-sm text-[#6e5d4f] max-w-2xl leading-relaxed">
          Want to add your app to WinterBuild or report an issue? Send us a quick message below and we will get back to you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Contact Form */}
        <div className="md:col-span-2">
          <form 
            id="form-contact-inquiry"
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-6 sm:p-8 space-y-5 shadow-xs"
          >
            {status && (
              <div
                className={`p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed ${
                  status.type === 'success'
                    ? 'bg-[#edf4ee] border border-[#cbe0ce] text-[#2d5c37]'
                    : 'bg-[#fcf0f0] border border-[#f0c8c8] text-[#8e2a2a]'
                }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2d5c37] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#8e2a2a] shrink-0 mt-0.5" />
                )}
                <span>{status.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-medium text-[#4d3c2e]">
                  Your Name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-medium text-[#4d3c2e]">
                  Your Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-subject" className="text-xs font-medium text-[#4d3c2e]">
                What is this about?
              </label>
              <select
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all cursor-pointer"
              >
                <option value="General Inquiry">General Question</option>
                <option value="APK App Submission">Add My Android App</option>
                <option value="Report Broken Download">Report a Broken Download</option>
                <option value="Security / Vulnerability Report">Safety or Security Concern</option>
                <option value="DMCA / Copyright Takedown">Copyright or Removal Request</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-medium text-[#4d3c2e]">
                Your Message *
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                placeholder="Write your message here... (If you want us to add an app, include a link to download it)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#faf7f2] border border-[#e2d8c7] text-[#281e16] placeholder-[#9a897b] text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#7c4d29] transition-all resize-y"
              />
            </div>

            <button
              id="btn-submit-contact"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#6b4423] hover:bg-[#543318] disabled:opacity-50 text-[#fdfcf9] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending Message...' : 'Send Message'}</span>
            </button>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-5 space-y-3 text-xs text-[#6e5d4f] shadow-xs">
            <h3 className="font-bold text-[#281e16] flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#7c4d29]" />
              How to Submit an App
            </h3>
            <p className="leading-relaxed">
              To help us add your app quickly, please include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#4d3c2e] pl-1 text-[11px]">
              <li>App name and version</li>
              <li>Your website or download link</li>
              <li>Required Android version</li>
              <li>Brief description of what your app does</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#ded5c5] bg-[#ffffff] p-5 space-y-2 text-xs text-[#6e5d4f] shadow-xs">
            <h3 className="font-bold text-[#281e16] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2d5c37]" />
              Quick Help
            </h3>
            <p className="text-[11px] leading-relaxed">
              We read every message and respond as quickly as possible.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
