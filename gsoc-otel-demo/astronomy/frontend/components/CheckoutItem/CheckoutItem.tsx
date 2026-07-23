// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Image from 'next/image';
import { useState } from 'react';
import { CypressFields } from '../../utils/enums/CypressFields';
import { Address } from '../../protos/demo';
import { IProductCheckoutItem } from '../../types/Cart';
import ProductPrice from '../ProductPrice';
import * as S from './CheckoutItem.styled';
import { useTranslation } from '../../utils/i18n';

interface IProps {
  checkoutItem: IProductCheckoutItem;
  address: Address;
}

const CheckoutItem = ({
  checkoutItem: {
    item: {
      quantity,
      product: { picture, name },
    },
    cost = { currencyCode: 'USD', units: 0, nanos: 0 },
  },
  address: { streetAddress = '', city = '', state = '', zipCode = '', country = '' },
}: IProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();

  return (
    <S.CheckoutItem data-cy={CypressFields.CheckoutItem}>
      <S.ItemDetails>
        {picture && <S.ItemImage src={`/images/products/${picture}`} alt={name} />}
        <S.Details>
          <S.ItemName>{name}</S.ItemName>
          <p>{t('checkout_summary.quantity')}: {quantity}</p>
          <p>
            {t('checkout_item.total')}: <ProductPrice price={cost} />
          </p>
        </S.Details>
      </S.ItemDetails>
      <S.ShippingData>
        <S.ItemName>{t('checkout_item.shipping_data')}</S.ItemName>
        <p>{t('checkout_item.street')}: {streetAddress}</p>
        {!isCollapsed && <S.SeeMore onClick={() => setIsCollapsed(true)}>{t('checkout_item.see_more')}</S.SeeMore>}
        {isCollapsed && (
          <>
            <p>{t('checkout_item.city')}: {city}</p>
            <p>{t('checkout_item.state')}: {state}</p>
            <p>{t('checkout_item.zip_code')}: {zipCode}</p>
            <p>{t('checkout_item.country')}: {country}</p>
          </>
        )}
      </S.ShippingData>
      <S.Status>
        <Image src="/icons/Check.svg" alt="check" height="14" width="16" /> <span>{t('checkout_item.done')}</span>
      </S.Status>
    </S.CheckoutItem>
  );
};

export default CheckoutItem;
