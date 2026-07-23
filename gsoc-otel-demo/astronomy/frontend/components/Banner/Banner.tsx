// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Link from 'next/link';
import * as S from './Banner.styled';
import { useTranslation } from '../../utils/i18n';

const Banner = () => {
  const { t } = useTranslation();
  return (
    <S.Banner>
      <S.ImageContainer>
        <S.BannerImg />
      </S.ImageContainer>
      <S.TextContainer>
        <S.Title>{t('home.banner_title')}</S.Title>
        <Link href="#hot-products"><S.GoShoppingButton>{t('home.banner_cta')}</S.GoShoppingButton></Link>
      </S.TextContainer>
    </S.Banner>
  );
};

export default Banner;
