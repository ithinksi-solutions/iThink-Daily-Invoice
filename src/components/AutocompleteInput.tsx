import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Building, Check } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'Type dealer name...',
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch unique dealer names once on mount
  useEffect(() => {
    async function loadDealerNames() {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('dealer_name')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          const names = Array.from(new Set(data.map((d: any) => d.dealer_name)));
          setSuggestions(names);
        }
      } catch (e) {
        console.error('Failed to fetch dealer suggestions:', e);
      }
    }
    loadDealerNames();
  }, []);

  // Filter as user types
  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions.slice(0, 6));
    } else {
      const q = value.toLowerCase();
      const matches = suggestions.filter((n) => n.toLowerCase().includes(q));
      setFiltered(matches.slice(0, 6));
    }
  }, [value, suggestions]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-4 py-3.5 pl-11 bg-slate-900 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base text-white placeholder-slate-500 outline-none transition-all shadow-inner"
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto animate-in fade-in duration-150">
          <div className="p-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 border-b border-slate-800">
            Past Dealers
          </div>
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors border-b border-slate-800/40 last:border-b-0"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-medium truncate">{item}</span>
              </div>
              {value.toLowerCase() === item.toLowerCase() && (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
