// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Header from '../Header';
import Footer from '../Footer';
import { useTranslation } from '../../utils/i18n';

interface IProps {
  children: React.ReactNode;
}

const Layout = ({ children }: IProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Header />
      <main aria-label={t('layout.store_name')}>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;
