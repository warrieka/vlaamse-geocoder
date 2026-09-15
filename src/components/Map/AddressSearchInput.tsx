import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, CircleX } from 'lucide-react';
import { suggestAddresses } from '../../services/geocoder';

interface AddressSearchInputProps {
  onAddressSelect?: (fullAddress: string) => void;
}

const COLLAPSE_BREAKPOINT = 768;

const getInitialExpanded = () =>
  typeof window === 'undefined' || window.innerWidth >= COLLAPSE_BREAKPOINT;

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  onAddressSelect,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState(getInitialExpanded);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapse by default when the viewport shrinks (e.g. mobile / narrow window)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < COLLAPSE_BREAKPOINT) {
        setExpanded(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleExpand = () => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleContract = () => {
    setExpanded(false);
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const results = await suggestAddresses(q);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
      setIsLoading(false);
    }, 250);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    setIsOpen(false);
    if (onAddressSelect) onAddressSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSelect(query.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (chosen) handleSelect(chosen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasQuery = query.trim().length > 0;

  // Collapsed: a single compact search button
  if (!expanded) {
    return (
      <div ref={containerRef}>
        <button
          type="button"
          onClick={handleExpand}
          title="Adres zoeken"
          aria-label="Adres zoeken"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-md text-slate-700 hover:bg-white hover:text-indigo-700 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-72 max-w-full">
      <div className="flex items-center bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200/80 shadow-md">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
        ) : hasQuery ? (
          <button
            type="button"
            onClick={handleContract}
            title="Zoekveld sluiten"
            aria-label="Zoekveld sluiten"
            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <CircleX className="w-4 h-4" />
          </button>
        ) : (
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="adres zoeken"
          className="address-search-input w-full bg-transparent ml-2 text-sm text-slate-800 outline-none"
        />
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={`${s}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                i === activeIndex
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="truncate">{s}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
