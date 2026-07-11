// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import Ad from '../../../../components/Ad';
import Button from '../../../../components/Button';
import Layout from '../../../../components/Layout';
import ProductPrice from '../../../../components/ProductPrice';
import Recommendations from '../../../../components/Recommendations';
import AdProvider from '../../../../providers/Ad.provider';
import { Money } from '../../../../protos/demo';
import * as S from '../../../../styles/Checkout.styled';
import { IProductCheckout } from '../../../../types/Cart';
import { useRuntimeConfig, useTranslation } from '../../../../utils/i18n';

const Checkout: NextPage = () => {
  const { query } = useRouter();
  const { t } = useTranslation();
  const { taxRate, taxLabel } = useRuntimeConfig();
  const {
    orderId,
    items = [],
    shippingAddress,
    shippingCost = { units: 0, currencyCode: 'USD', nanos: 0 },
  } = JSON.parse((query.order || '{}') as string) as IProductCheckout;

  const orderTotal = useMemo<Money>(() => {
    const itemsTotal = items.reduce(
      (acc, { item, cost = { units: 0, nanos: 0, currencyCode: 'USD' } }) => {
        return {
          units: acc.units + (cost.units || 0) * item.quantity,
          nanos: acc.nanos + (cost.nanos || 0) * item.quantity,
          currencyCode: cost.currencyCode || 'USD',
        };
      },
      { units: 0, nanos: 0, currencyCode: 'USD' }
    );

    const totalNanos = itemsTotal.nanos + (shippingCost.nanos || 0);
    const nanoExceed = Math.floor(totalNanos / 1000000000);

    return {
      units: itemsTotal.units + (shippingCost.units || 0) + nanoExceed,
      nanos: totalNanos % 1000000000,
      currencyCode: shippingCost.currencyCode || 'USD',
    };
  }, [items, shippingCost]);

  const taxAmount = useMemo<Money>(() => {
    const taxRateValue = Number(taxRate || '0');

    if (!Number.isFinite(taxRateValue) || taxRateValue <= 0) {
      return { units: 0, nanos: 0, currencyCode: orderTotal.currencyCode };
    }

    const subtotal = items.reduce(
      (acc, { item, cost = { units: 0, nanos: 0, currencyCode: orderTotal.currencyCode } }) => {
        const itemTotalNanos = (cost.units || 0) * item.quantity * 1000000000 + (cost.nanos || 0) * item.quantity;
        return acc + itemTotalNanos;
      },
      0
    );

    const taxableNanos = Math.round((subtotal * taxRateValue) / 100);

    return {
      units: Math.floor(taxableNanos / 1000000000),
      nanos: taxableNanos % 1000000000,
      currencyCode: orderTotal.currencyCode,
    };
  }, [items, orderTotal.currencyCode, taxRate]);

  const totalWithTax = useMemo<Money>(() => {
    const totalNanos = orderTotal.nanos + taxAmount.nanos;
    const nanoExceed = Math.floor(totalNanos / 1000000000);

    return {
      units: orderTotal.units + taxAmount.units + nanoExceed,
      nanos: totalNanos % 1000000000,
      currencyCode: orderTotal.currencyCode,
    };
  }, [orderTotal, taxAmount]);

  const taxLabelText = `${taxLabel} (${taxRate}%)`;

  return (
    <AdProvider
      productIds={items.map(({ item }) => item?.productId || '')}
      contextKeys={[...new Set(items.flatMap(({ item }) => item.product.categories))]}
    >
      <Head>
        <title>{t('page_titles.checkout')}</title>
      </Head>
      <Layout>
        <S.Checkout>
          <S.Container>
            <S.LeftColumn>
              <S.Title>{t('checkout_summary.complete')}</S.Title>
              <S.Subtitle>{t('checkout_summary.sent_email')}</S.Subtitle>
              <S.OrderInfo>
                <S.InfoLabel>{t('checkout_summary.order_id')}</S.InfoLabel>
                <S.InfoValue>{orderId}</S.InfoValue>
              </S.OrderInfo>
            </S.LeftColumn>

            <S.RightColumn>
              <S.SectionTitle>{t('checkout_summary.shipping_address')}</S.SectionTitle>
              <S.AddressText>{shippingAddress.streetAddress}</S.AddressText>
              <S.AddressText>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
              </S.AddressText>
              <S.AddressText>{shippingAddress.country}</S.AddressText>
            </S.RightColumn>

            <S.ItemsSection>
              <S.SectionTitle>{t('checkout_summary.order_items')}</S.SectionTitle>
              <S.ItemList>
                {items.map(({ item, cost = { units: 0, currencyCode: 'USD', nanos: 0 } }) => {
                  const itemTotal: Money = {
                    units: (cost.units || 0) * item.quantity,
                    nanos: (cost.nanos || 0) * item.quantity,
                    currencyCode: cost.currencyCode || 'USD',
                  };
                  // Handle nanos overflow
                  const nanoExceed = Math.floor(itemTotal.nanos / 1000000000);
                  itemTotal.units += nanoExceed;
                  itemTotal.nanos = itemTotal.nanos % 1000000000;

                  return (
                    <S.OrderItem key={item.productId}>
                      <S.ItemImage src={'/images/products/' + item.product.picture} alt={item.product.name} />
                      <S.ItemDetails>
                        <S.ItemName>{item.product.name}</S.ItemName>
                        <S.ItemQuantity>
                          {t('checkout_summary.quantity')}: {item.quantity}
                        </S.ItemQuantity>
                      </S.ItemDetails>
                      <S.ItemPrice>
                        <ProductPrice price={itemTotal} />
                      </S.ItemPrice>
                    </S.OrderItem>
                  );
                })}
              </S.ItemList>

              <S.OrderSummary>
                <S.SummaryRow>
                  <span>{t('checkout_summary.shipping')}:</span>
                  <ProductPrice price={shippingCost} />
                </S.SummaryRow>
                <S.SummaryRow>
                  <span>{taxLabelText}:</span>
                  <ProductPrice price={taxAmount} />
                </S.SummaryRow>
                <S.TotalRow>
                  <S.TotalLabel>{t('checkout_summary.total')}:</S.TotalLabel>
                  <S.TotalAmount>
                    <ProductPrice price={totalWithTax} />
                  </S.TotalAmount>
                </S.TotalRow>
              </S.OrderSummary>
            </S.ItemsSection>

            <S.ButtonContainer>
              <Link href="/">
                <Button type="submit">{t('common.continue_shopping')}</Button>
              </Link>
            </S.ButtonContainer>
          </S.Container>
          <Recommendations />
        </S.Checkout>
        <Ad />
      </Layout>
    </AdProvider>
  );
};

export default Checkout;
