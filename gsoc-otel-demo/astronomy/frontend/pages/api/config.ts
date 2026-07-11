// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { NextApiRequest, NextApiResponse } from 'next';
import InstrumentationMiddleware from '../../utils/telemetry/InstrumentationMiddleware';

type RuntimeConfig = {
  locale: string;        // e.g. "hi-IN"
  language: string;      // e.g. "hi"
  currency: string;      // e.g. "INR"
  taxRate: string;       // e.g. "18"
  taxLabel: string;      // e.g. "GST"
};

const handler = async ({ method }: NextApiRequest, res: NextApiResponse<RuntimeConfig | { error: string }>) => {
  switch (method) {
    case 'GET': {
      const locale = process.env.NEXT_PUBLIC_LOCALE || 'en-US';
      const language = locale.split('-')[0] || 'en';
      const currency = process.env.DEFAULT_CURRENCY || 'USD';
      const taxRate = process.env.TAX_RATE || '0';
      const taxLabel = process.env.TAX_LABEL || 'Tax';
      return res.status(200).json({ locale, language, currency, taxRate, taxLabel });
    }
    default: {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  }
};

export default InstrumentationMiddleware(handler);
