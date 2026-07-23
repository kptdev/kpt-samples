// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';
import ProductList from '../components/ProductList';
import * as S from '../styles/Home.styled';
import { useQuery } from '@tanstack/react-query';
import ApiGateway from '../gateways/Api.gateway';
import Banner from '../components/Banner';
import { CypressFields } from '../utils/enums/CypressFields';
import { useCurrency } from '../providers/Currency.provider';
import { useTranslation } from '../utils/i18n';

const Home: NextPage = () => {
  const { t } = useTranslation();
  const { selectedCurrency } = useCurrency();
  const { data: productList = [] } = useQuery({
    queryKey: ['products', selectedCurrency],
    queryFn: () => ApiGateway.listProducts(selectedCurrency),
  });

  return (
    <Layout>
      <Head>
        <title>{t('page_titles.home')}</title>
      </Head>
      <S.Home data-cy={CypressFields.HomePage}>
        <Banner />
        <S.Container>
          <S.Row>
            <S.Content>
              <S.HotProducts>
                <S.HotProductsTitle data-cy={CypressFields.HotProducts} id="hot-products">
                  {t('home.hot_products')}
                </S.HotProductsTitle>
                <ProductList productList={productList} />
              </S.HotProducts>
            </S.Content>
          </S.Row>
        </S.Container>
      </S.Home>
    </Layout>
  );
};

export default Home;
