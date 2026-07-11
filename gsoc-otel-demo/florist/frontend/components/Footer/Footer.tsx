// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import * as S from './Footer.styled';
import SessionGateway from '../../gateways/Session.gateway';
import { CypressFields } from '../../utils/enums/CypressFields';
import PlatformFlag from '../PlatformFlag';
import { useTranslation } from '../../utils/i18n';

const currentYear = new Date().getFullYear();

const { userId } = SessionGateway.getSession();

const Footer = () => {
  const [sessionId, setSessionId] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    setSessionId(userId);
  }, []);

  return (
    <S.Footer>
      <div>
        <p>{t('footer.demo_notice')}</p>
        <p>
          <span data-cy={CypressFields.SessionId}>session-id: {sessionId}</span>
        </p>
      </div>
      <p>
        @ {currentYear} {t('layout.store_name')}
      </p>
      <PlatformFlag />
    </S.Footer>
  );
};

export default Footer;
