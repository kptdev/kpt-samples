// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { DefaultTheme } from 'styled-components';

const Theme: DefaultTheme = {
  colors: {
    otelBlue: '#40916c',
    otelYellow: '#f9c74f',
    otelGray: '#2d6a4f',
    otelRed: '#e63946',
    backgroundGray: 'rgba(45, 106, 79, 0.1)',
    lightBorderGray: 'rgba(64, 145, 108, 0.3)',
    borderGray: '#1b4332',
    textGray: '#1b4332',
    textLightGray: '#52796f',
    white: '#FFFFFF',
  },
  breakpoints: {
    desktop: '@media (min-width: 768px)',
  },
  sizes: {
    mxLarge: '22px',
    mLarge: '20px',
    mMedium: '14px',
    mSmall: '12px',
    dxLarge: '58px',
    dLarge: '40px',
    dMedium: '18px',
    dSmall: '16px',
    nano: '8px',
  },
  fonts: {
    bold: '800',
    regular: '500',
    semiBold: '700',
    light: '400',
  },
};

export default Theme;
