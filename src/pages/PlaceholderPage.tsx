import React from 'react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
  category: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  icon,
  description,
  category,
}) => {
  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg flex-1 flex flex-col justify-center items-center text-center">
      <div className="max-w-xl p-space-xl rounded-xl bg-surface-container-low border border-white/5 space-y-space-md shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>

        <div className="space-y-1">
          <span className="font-label-sm text-label-sm font-mono text-outline uppercase tracking-wider">
            {category}
          </span>
          <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface">
            {title}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
            {description}
          </p>
        </div>

        <div className="p-space-md rounded-lg bg-surface-container-lowest font-mono font-label-sm text-label-sm text-outline border border-white/5 space-y-1 text-left">
          <div className="text-secondary flex items-center gap-1.5 font-semibold">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
            <span>FASTAPI BACKEND READY</span>
          </div>
          <div>Endpoint: <code className="text-primary font-mono">/api/v1/{category.toLowerCase().replace(/\s+/g, '_')}</code></div>
          <div>Modbus Register Mapping: Polyphase ADE7758 & PZEM-004T v3</div>
        </div>

        <div className="flex items-center justify-center gap-space-sm pt-2">
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-mono font-semibold hover:bg-primary-fixed transition-colors shadow-sm"
          >
            ← Back to Overview
          </Link>
          <Link
            to="/live-monitoring"
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-mono transition-colors border border-white/5"
          >
            Live Hardware Stream →
          </Link>
        </div>
      </div>
    </div>
  );
};
