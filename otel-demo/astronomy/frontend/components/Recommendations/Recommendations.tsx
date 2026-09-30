// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { CypressFields } from '../../utils/enums/CypressFields';
import { useAd } from '../../providers/Ad.provider';
import ProductCard from '../ProductCard';
import * as S from './Recommendations.styled';
import { useTranslation } from '../../utils/i18n';

const Recommendations = () => {
  const { recommendedProductList } = useAd();
  const { t } = useTranslation();

  if (!recommendedProductList || recommendedProductList.length === 0) {
    return null;
  }

  return (
    <S.Recommendations data-cy={CypressFields.RecommendationList}>
      <S.TitleContainer>
        <S.Title>{t('common.recommendations')}</S.Title>
      </S.TitleContainer>
      <S.ProductList>
        {recommendedProductList.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </S.ProductList>
    </S.Recommendations>
  );
};

export default Recommendations;
