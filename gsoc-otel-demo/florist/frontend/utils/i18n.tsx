// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext, useMemo } from 'react';
import en from '../public/locales/en.json';
import ja from '../public/locales/ja.json';
import cs from '../public/locales/cs.json';

// All locales are statically imported so the bundle resolves at build time.
// The active locale is chosen by NEXT_PUBLIC_LOCALE (e.g. "en-US", "ja-JP", "cs-CZ"),
// which is injected as an env var by the regional Kpt pipeline.
const BUNDLES: Record<string, any> = { en, ja, cs };

function resolveLocale(): string {
  const raw = process.env.NEXT_PUBLIC_LOCALE || 'en-US';
  // Use the language sub-tag ("en" from "en-US") to pick a translation bundle.
  const lang = raw.split('-')[0];
  return BUNDLES[lang] ? lang : 'en';
}

type Ctx = { t: (key: string) => string };
const I18nCtx = createContext<Ctx>({ t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const dict = BUNDLES[resolveLocale()] || BUNDLES.en;
    return {
      // Dotted-key lookup, e.g. t("cart.title"). Falls back to the key itself on miss.
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
  }, []);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useTranslation() {
  return useContext(I18nCtx);
}
