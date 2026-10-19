import React, { useState, useEffect } from 'react';
import { Entry, Profile } from '../types/database';
import { formatAppDate, formatAppTime, formatINR } from '../lib/formatters';
import {
  X,
  Image as ImageIcon,
  Download,
  ZoomIn,
  Building2,
  User,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface DaySlipsGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  entries: Entry[];
  operators: Profile[];
}

export const DaySlipsGalleryModal: React.FC<DaySlipsGalleryModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  entries,
  operators,
}) => {
  const [activeSlip, setActiveSlip] = useState<{
    url: string;
    dealer: string;
    operator: string;
    amount: number;
    business: string;
    time: string;
  } | null>(null);

  // Hardware Back Button Dismissal Listener
  useEffect(() => {
    if (!isOpen) return;
    const handleDismiss = (e: Event) => {
      e.preventDefault();
      if (activeSlip) {
        setActiveSlip(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('dismissActiveModal', handleDismiss);
    return () => window.removeEventListener('dismissActiveModal', handleDismiss);
  }, [isOpen, activeSlip, onClose]);

  if (!isOpen) return null;

  // Filter entries for this date that have an image_url
  const slipEntries = entries.filter((e) => Boolean(e.image_url));

  const getOperatorName = (collectorId: string) => {
    return operators.find((o) => o.id === collectorId)?.full_name || 'Operator';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Day Slips Gallery
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  {slipEntries.length} {slipEntries.length === 1 ? 'Slip' : 'Slips'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All physical bill photos collected on {formatAppDate(selectedDate)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slips Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {slipEntries.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500 mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">No Slips Uploaded for This Date</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Operators can capture physical handwritten slips from their mobile camera or upload from files when logging collections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slipEntries.map((e) => {
                const opName = getOperatorName(e.collector_id);
                return (
                  <div
                    key={e.id}
                    className="group rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 transition-all overflow-hidden flex flex-col shadow-sm"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer"
                      onClick={() => setActiveSlip({
                        url: e.image_url!,
                        dealer: e.dealer_name,
                        operator: opName,
                        amount: e.total_collected,
                        business: e.business_name,
                        time: formatAppTime(e.created_at),
                      })}
                    >
                      <img
                        src={e.image_url!}
                        alt={e.dealer_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-2 rounded-xl bg-slate-900/90 text-white shadow-lg backdrop-blur-sm">
                          <ZoomIn className="w-4 h-4" />
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-950/80 backdrop-blur-sm text-slate-300 border border-slate-700">
                        {e.business_name}
                      </span>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                            {e.dealer_name}
                          </h4>
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {formatINR(e.total_collected)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span className="truncate">{opName}</span>
                          <span className="font-mono text-slate-500">{formatAppTime(e.created_at)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500 truncate">
                          {e.note || 'Slip Attached'}
                        </span>
                        <a
                          href={e.image_url!}
                          target="_blank"
                          rel="noreferrer"
                          download={`Slip_${e.dealer_name}_${selectedDate}.jpg`}
                          className="p-1 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-900 transition-colors"
                          title="Open Full Image"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{slipEntries.length} verified slip photos for {formatAppDate(selectedDate)}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {activeSlip && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActiveSlip(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={activeSlip.url}
              alt={activeSlip.dealer}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl"
            />

            <div className="mt-3 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-6 text-xs text-slate-300 w-full max-w-lg">
              <div>
                <span className="font-bold text-white">{activeSlip.dealer}</span> •{' '}
                <span className="font-mono text-emerald-400 font-bold">{formatINR(activeSlip.amount)}</span>
                <div className="text-[11px] text-slate-400">{activeSlip.operator} • {activeSlip.time}</div>
              </div>
              <a
                href={activeSlip.url}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
