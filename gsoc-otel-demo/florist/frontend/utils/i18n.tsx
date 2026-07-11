// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../public/locales/en.json';
import ja from '../public/locales/ja.json';
import cs from '../public/locales/cs.json';
import hi from '../public/locales/hi.json';
import zh from '../public/locales/zh.json';

// All locale JSONs are statically bundled. We just pick the right one at runtime
// by fetching /api/config which reads NEXT_PUBLIC_LOCALE on the server.
const BUNDLES: Record<string, any> = { en, ja, cs, hi, zh };

export type RuntimeConfig = {
  locale: string;
  language: string;
  currency: string;
  taxRate: string;
  taxLabel: string;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  locale: 'en-US',
  language: 'en',
  currency: 'USD',
  taxRate: '0',
  taxLabel: 'Tax',
};

const RuntimeConfigCtx = createContext<RuntimeConfig>(DEFAULT_CONFIG);
const I18nCtx = createContext<{ t: (key: string) => string }>({ t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: RuntimeConfig) => { if (!cancelled) setConfig(data); })
      .catch(() => { /* keep DEFAULT_CONFIG on error */ });
    return () => { cancelled = true; };
  }, []);

  const tValue = useMemo(() => {
    const dict = BUNDLES[config.language] || BUNDLES.en;
    return {
      t: (key: string) => {
        const parts = key.split('.');
        let cur: any = dict;
        for (const p of parts) {
          if (cur == null || typeof cur !== 'object') return key;
          cur = cur[p];
        }
        return typeof cur === 'string' ? cur : key;
      },
    };
  }, [config.language]);

  return (
    <RuntimeConfigCtx.Provider value={config}>
      <I18nCtx.Provider value={tValue}>{children}</I18nCtx.Provider>
    </RuntimeConfigCtx.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nCtx);
}

export function useRuntimeConfig() {
  return useContext(RuntimeConfigCtx);
}
