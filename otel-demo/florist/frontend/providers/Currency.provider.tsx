// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ApiGateway from '../gateways/Api.gateway';
import SessionGateway from '../gateways/Session.gateway';
import { useRuntimeConfig } from '../utils/i18n';

interface IContext {
  currencyCodeList: string[];
  setSelectedCurrency(currency: string): void;
  selectedCurrency: string;
}

export const Context = createContext<IContext>({
  currencyCodeList: [],
  selectedCurrency: 'USD',
  setSelectedCurrency: () => ({}),
});

interface IProps {
  children: React.ReactNode;
}

export const useCurrency = () => useContext(Context);

const CurrencyProvider = ({ children }: IProps) => {
  const { data: currencyCodeListUnsorted = [] } = useQuery({
    queryKey: ['currency'],
    queryFn: ApiGateway.getSupportedCurrencyList,
  });

  const runtimeConfig = useRuntimeConfig();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(runtimeConfig.currency || 'USD');
  const [hasUserSelectedCurrency, setHasUserSelectedCurrency] = useState(false);

  useEffect(() => {
    if (!hasUserSelectedCurrency) {
      const resolvedCurrency = runtimeConfig.currency || 'USD';
      setSelectedCurrency(resolvedCurrency);
      SessionGateway.setSessionValue('currencyCode', resolvedCurrency);
      SessionGateway.setSessionValue('currencyExplicitlySelected', false);
    }
  }, [runtimeConfig.currency, hasUserSelectedCurrency]);

  const onSelectCurrency = useCallback((currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    setHasUserSelectedCurrency(true);
    SessionGateway.setSessionValue('currencyCode', currencyCode);
    SessionGateway.setSessionValue('currencyExplicitlySelected', true);
  }, []);

  const currencyCodeList = currencyCodeListUnsorted.sort();

  const value = useMemo(
    () => ({
      currencyCodeList,
      selectedCurrency,
      setSelectedCurrency: onSelectCurrency,
    }),
    [currencyCodeList, selectedCurrency, onSelectCurrency]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default CurrencyProvider;
