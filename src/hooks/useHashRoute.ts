import { useCallback, useEffect, useState } from 'react';
import type { AppView } from '../components/Header/Header';

// path <-> view mapping
const toPath = (view: AppView): string => {
  switch (view) {
    case 'addressSearch':
      return '/adressenregister';
    case 'advisor':
      return '/info';
    case 'geocoder':
    default:
      return '/geocoder';
  }
};

const toView = (path: string): AppView => {
  const clean = (path || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  switch (clean) {
    case 'adressenregister':
      return 'addressSearch';
    case 'info':
      return 'advisor';
    case 'geocoder':
    default:
      return 'geocoder';
  }
};

// Known view identifiers (AppView is a string union, so `typeof` can't
// distinguish a view from a raw path — we match by membership instead).
const APP_VIEWS: readonly string[] = ['geocoder', 'addressSearch', 'advisor'];

const normalizePath = (input: string): string => {
  const p = input.startsWith('/') ? input : `/${input}`;
  return p === '/' ? '/geocoder' : p;
};

const readHashPath = (): string => {
  const raw = window.location.hash.replace(/^#/, '');
  return raw ? normalizePath(raw) : '/geocoder';
};

export function useHashRoute() {
  const [path, setPath] = useState<string>(() => readHashPath());

  useEffect(() => {
    const onHashChange = () => setPath(readHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: AppView | string) => {
    const target = APP_VIEWS.includes(next) ? toPath(next as AppView) : next;
    const finalPath = normalizePath(target);
    if (`#${finalPath}` !== window.location.hash) {
      window.location.hash = finalPath;
    }
    setPath(finalPath);
  }, []);

  return {
    path,
    view: toView(path),
    pathFor: toPath,
    navigate,
  };
}
