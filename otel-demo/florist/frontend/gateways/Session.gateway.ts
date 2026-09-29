// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid';

interface ISession {
  userId: string;
  currencyCode: string;
  currencyExplicitlySelected: boolean;
}

const sessionKey = 'session';
const defaultSession: Readonly<ISession> = Object.freeze({
  userId: v4(),
  currencyCode: '',
  currencyExplicitlySelected: false,
});

const normalizeSession = (session: unknown): ISession | null => {
  if (typeof session !== 'object' || session === null) {
    return null;
  }

  const candidate = session as Partial<ISession>;

  if (typeof candidate.userId !== 'string' || typeof candidate.currencyCode !== 'string') {
    return null;
  }

  return {
    userId: candidate.userId,
    currencyCode: candidate.currencyCode,
    currencyExplicitlySelected: candidate.currencyExplicitlySelected === true,
  };
};

const SessionGateway = () => ({
  getSession(): ISession {
    if (typeof window === 'undefined') return defaultSession;
    const sessionString = localStorage.getItem(sessionKey);

    if (sessionString) {
      try {
        const parsed: unknown = JSON.parse(sessionString);
        const normalized = normalizeSession(parsed);
        if (normalized) {
          return normalized;
        }
      } catch (e) {
        console.warn('Failed to parse session from localStorage', e);
      }
    }
    localStorage.setItem(sessionKey, JSON.stringify(defaultSession));
    return defaultSession;
  },
  setSessionValue<K extends keyof ISession>(key: K, value: ISession[K]) {
    const session = this.getSession();

    localStorage.setItem(sessionKey, JSON.stringify({ ...session, [key]: value }));
  },
});

export default SessionGateway();
