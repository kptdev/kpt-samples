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
  const session = SessionGateway.getSession();
  const sessionCurrency = session.currencyExplicitlySelected ? session.currencyCode : '';
  const initialCurrency = sessionCurrency || runtimeConfig.currency || 'USD';

  const [selectedCurrency, setSelectedCurrency] = useState<string>(initialCurrency);
  const [hasUserSelected, setHasUserSelected] = useState<boolean>(Boolean(session.currencyExplicitlySelected));

  useEffect(() => {
    if (runtimeConfig.currency && !hasUserSelected) {
      setSelectedCurrency(runtimeConfig.currency);
    }
  }, [runtimeConfig.currency, hasUserSelected]);

  useEffect(() => {
    if (session.currencyExplicitlySelected && sessionCurrency) setSelectedCurrency(sessionCurrency);
  }, [sessionCurrency, session.currencyExplicitlySelected]);

  const onSelectCurrency = useCallback((currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    setHasUserSelected(true);
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
