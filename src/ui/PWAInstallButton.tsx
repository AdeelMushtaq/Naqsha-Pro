import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { language } = useStore();
  const t = translations[language];

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors whitespace-nowrap active:scale-95"
        title={t.app.installApp}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.app.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white mb-2">iPhone / iPad Par Install Karein</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                1. Safari browser ke neechay <strong>Share (شیئر)</strong> icon par tap karein.<br />
                2. Neechay scroll karke <strong>Add to Home Screen</strong> select karein.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Theek Hai (Close)
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
