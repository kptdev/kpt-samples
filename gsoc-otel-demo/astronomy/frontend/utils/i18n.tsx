// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

type RuntimeConfig = {
  locale: string;
  language: string;
  currency: string;
  taxRate: string;
  taxLabel: string;
};

type Translations = Record<string, string>;

interface I18nContextProps {
  t: (key: string) => string;
  config: RuntimeConfig;
}

const defaultConfig: RuntimeConfig = {
  locale: 'en-US',
  language: 'en',
  currency: 'USD',
  taxRate: '0',
  taxLabel: 'Tax',
};

const I18nContext = createContext<I18nContextProps>({
  t: (key) => key,
  config: defaultConfig,
});

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return { t: context.t };
};

export const useRuntimeConfig = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useRuntimeConfig must be used within an I18nProvider');
  }
  return context.config;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [translations, setTranslations] = useState<Translations>({});
  const [config, setConfig] = useState<RuntimeConfig>(defaultConfig);

  const { data: fetchedConfig } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json() as Promise<RuntimeConfig>;
    },
  });

  useEffect(() => {
    if (fetchedConfig) {
      setConfig(fetchedConfig);
    }
  }, [fetchedConfig]);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const lang = config.language;
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
          if (lang !== 'en') {
             // Fallback to English
             const fallback = await fetch(`/locales/en.json`);
             if (fallback.ok) {
               const fallbackData = await fallback.json();
               setTranslations(fallbackData);
               return;
             }
          }
          throw new Error('Translations not found');
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations', error);
      }
    };

    loadTranslations();
  }, [config.language]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  return (
    <I18nContext.Provider value={{ t, config }}>
      {children}
    </I18nContext.Provider>
  );
};
