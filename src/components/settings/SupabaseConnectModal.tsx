import React, { useState } from 'react';
import { X, Database, CheckCircle2, Copy, AlertCircle, ExternalLink, Terminal } from 'lucide-react';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const envContent =
    '# Create .env in project root with these keys:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key\n' +
    'VITE_DEFAULT_COMPANY_ID=cmp-srilakshmi-001';

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                Supabase PostgreSQL Cloud Storage
              </h2>
              <p className="text-xs text-neutral-500">
                Setup persistent cloud storage & multi-tenant RLS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-neutral-700">
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#111111] mt-1 shrink-0" />
            <div>
              <p className="font-bold text-[#111111]">Current Status: {isConfigured ? 'Supabase Connected' : 'Running in Local Demonstration Mode'}</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                {isConfigured
                  ? 'Your application is connected to production Supabase PostgreSQL with Row-Level Security active.'
                  : 'All transactions, chits, and ledgers are securely persisted to browser LocalStorage. Follow the steps below to connect a dedicated Supabase database.'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-[#111111] mb-2 uppercase tracking-wider text-[11px]">
              Step 1: Create Free Supabase Project
            </h3>
            <p className="leading-relaxed">
              Navigate to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-semibold text-[#111111]">supabase.com</a>, create a free project, and copy your Project URL and Anon Public Key from Project Settings → API.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#111111] mb-2 uppercase tracking-wider text-[11px]">
              Step 2: Run Database Migrations
            </h3>
            <p className="leading-relaxed">
              Open Supabase SQL Editor and run the comprehensive migration file located at:
            </p>
            <div className="mt-1 p-2 bg-neutral-100 rounded-lg font-mono text-[11px] text-[#111111]">
              supabase/migrations/20261011000001_chitflow_initial_schema.sql
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-bold text-[#111111] uppercase tracking-wider text-[11px]">
                Step 3: Add Environment Variables
              </h3>
              <button
                onClick={handleCopyEnv}
                className="text-[11px] font-semibold text-[#111111] underline flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy Template'}</span>
              </button>
            </div>
            <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto">
              {envContent}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#111111] text-white rounded-lg hover:bg-[#262626]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
