// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Link from 'next/link';
import Button from '../Button';
import * as S from '../../styles/Cart.styled';
import { useTranslation } from '../../utils/i18n';

const EmptyCart = () => {
  const { t } = useTranslation();
  return (
    <S.EmptyCartContainer>
      <S.Title>{t('cart.empty')}</S.Title>
      <S.Subtitle>Items you add to your shopping cart will appear here.</S.Subtitle>

      <S.ButtonContainer>
        <Link href="/">
          <Button type="submit">{t('common.continue_shopping')}</Button>
        </Link>
      </S.ButtonContainer>
    </S.EmptyCartContainer>
  );
};

export default EmptyCart;
