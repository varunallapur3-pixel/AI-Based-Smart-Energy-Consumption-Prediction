import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
        <span className="material-symbols-outlined text-4xl">error_outline</span>
      </div>
      <div className="space-y-1">
        <div className="font-mono text-primary text-sm font-semibold">ERROR 404 // ROUTE UNRECOGNIZED</div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Substation Circuit Not Found
        </h1>
        <p className="font-body-md text-on-surface-variant max-w-md">
          The requested telemetry endpoint or dashboard coordinate does not exist in the active cluster registry.
        </p>
      </div>
      <Link
        to="/"
        className="px-4 py-2 rounded-lg bg-primary text-on-primary font-mono text-sm font-semibold hover:bg-primary-fixed transition-colors"
      >
        Return to Overview Console
      </Link>
    </div>
  );
};
