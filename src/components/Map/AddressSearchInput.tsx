import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { suggestAddresses } from '../../services/geocoder';

interface AddressSearchInputProps {
  onAddressSelect?: (fullAddress: string) => void;
}

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  onAddressSelect,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Close on outside click
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

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="flex items-center bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200/80 shadow-md">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <input
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
