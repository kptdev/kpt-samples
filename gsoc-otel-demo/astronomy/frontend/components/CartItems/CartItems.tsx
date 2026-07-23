// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import ApiGateway from '../../gateways/Api.gateway';
import { Address, Money } from '../../protos/demo';
import { useCurrency } from '../../providers/Currency.provider';
import { IProductCartItem } from '../../types/Cart';
import ProductPrice from '../ProductPrice';
import CartItem from './CartItem';
import * as S from './CartItems.styled';
import { useRuntimeConfig, useTranslation } from '../../utils/i18n';

interface IProps {
  productList: IProductCartItem[];
  shouldShowPrice?: boolean;
}

const CartItems = ({ productList, shouldShowPrice = true }: IProps) => {
  const { t } = useTranslation();
  const { taxRate, taxLabel } = useRuntimeConfig();
  const { selectedCurrency } = useCurrency();
  const address: Address = {
    streetAddress: '1600 Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    country: 'United States',
    zipCode: '94043',
  };

  const queryKey = ['shipping', productList, selectedCurrency, address];
  const queryFn = () => ApiGateway.getShippingCost(productList, selectedCurrency, address);
  const queryOptions: UseQueryOptions<Money, Error> = {
    queryKey,
    queryFn,
  };
  const { data: shippingConst = { units: 0, currencyCode: 'USD', nanos: 0 } } = useQuery(queryOptions);

  const taxAmount = useMemo<Money>(() => {
    const taxRateValue = Number(taxRate || '0');

    if (!Number.isFinite(taxRateValue) || taxRateValue <= 0) {
      return { units: 0, nanos: 0, currencyCode: selectedCurrency };
    }

    const subtotalNanos = productList.reduce(
      (acc, { product: { priceUsd: { units = 0, nanos = 0 } = {} }, quantity }) => {
        return acc + (Number(units) * 1000000000 + Number(nanos)) * quantity;
      },
      0
    );

    const taxableNanos = Math.round((subtotalNanos * taxRateValue) / 100);

    return {
      units: Math.floor(taxableNanos / 1000000000),
      nanos: taxableNanos % 1000000000,
      currencyCode: selectedCurrency,
    };
  }, [productList, selectedCurrency, taxRate]);

  const total = useMemo<Money>(() => {
    const subtotalNanos = productList.reduce(
      (acc, { product: { priceUsd: { nanos = 0 } = {} }, quantity }) => acc + Number(nanos) * quantity,
      0
    );
    const nanoSum = subtotalNanos + (shippingConst?.nanos || 0) + taxAmount.nanos;
    const nanoExceed = Math.floor(nanoSum / 1000000000);

    const unitSum =
      productList.reduce(
        (acc, { product: { priceUsd: { units = 0 } = {} }, quantity }) => acc + Number(units) * quantity,
        0
      ) +
      (shippingConst?.units || 0) +
      taxAmount.units +
      nanoExceed;

    return {
      units: unitSum,
      currencyCode: selectedCurrency,
      nanos: nanoSum % 1000000000,
    };
  }, [shippingConst?.units, shippingConst?.nanos, productList, selectedCurrency, taxAmount.units, taxAmount.nanos]);

  const taxLabelText = `${taxLabel} (${taxRate}%)`;

  return (
    <S.CartItems>
      <S.CardItemsHeader>
        <label>{t('cart.item')}</label>
        <label>{t('cart.quantity')}</label>
        <label>{t('cart.price')}</label>
      </S.CardItemsHeader>
      {productList.map(({ productId, product, quantity }) => (
        <CartItem key={productId} product={product} quantity={quantity} />
      ))}
      {shouldShowPrice && (
        <>
          <S.DataRow>
            <span>{taxLabelText}</span>
            <ProductPrice price={taxAmount} />
          </S.DataRow>
          <S.DataRow>
            <span>{t('checkout_summary.shipping')}</span>
            <ProductPrice price={shippingConst} />
          </S.DataRow>
          <S.DataRow>
            <S.TotalText>{t('checkout_summary.total')}</S.TotalText>
            <S.TotalText>
              <ProductPrice price={total} />
            </S.TotalText>
          </S.DataRow>
        </>
      )}
    </S.CartItems>
  );
};

export default CartItems;
