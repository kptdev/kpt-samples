// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { CypressFields } from '../../utils/enums/CypressFields';
import Input from '../Input';
import * as S from './CheckoutForm.styled';
import { useRuntimeConfig, useTranslation } from '../../utils/i18n';

const currentYear = new Date().getFullYear();
const yearList = Array.from(new Array(20), (v, i) => i + currentYear);

export interface IFormData {
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  creditCardNumber: string;
  creditCardCvv: number;
  creditCardExpirationYear: number;
  creditCardExpirationMonth: number;
}

interface IProps {
  onSubmit(formData: IFormData): void;
}

const CheckoutForm = ({ onSubmit }: IProps) => {
  const { t } = useTranslation();
  const { locale } = useRuntimeConfig();
  const [
    {
      email,
      streetAddress,
      city,
      state,
      country,
      zipCode,
      creditCardCvv,
      creditCardExpirationMonth,
      creditCardExpirationYear,
      creditCardNumber,
    },
    setFormData,
  ] = useState<IFormData>({
    email: 'someone@example.com',
    streetAddress: '1600 Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    country: 'United States',
    zipCode: "94043",
    creditCardNumber: '4432-8015-6152-0454',
    creditCardCvv: 672,
    creditCardExpirationYear: 2030,
    creditCardExpirationMonth: 1,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(formData => ({
      ...formData,
      [e.target.name]: e.target.value,
    }));
  }, []);

  const monthLabels = useMemo(() => Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(locale || 'en-US', { month: 'long' }).format(new Date(2020, index, 1))), [locale]);

  return (
    <S.CheckoutForm
      onSubmit={(event: { preventDefault: () => void; }) => {
        event.preventDefault();
        onSubmit({
          email,
          streetAddress,
          city,
          state,
          country,
          zipCode,
          creditCardCvv,
          creditCardExpirationMonth,
          creditCardExpirationYear,
          creditCardNumber,
        });
      }}
    >
      <S.Title>{t('checkout_form.shipping_address')}</S.Title>

      <Input
        label={t('checkout_form.email_address')}
        type="email"
        id="email"
        name="email"
        value={email}
        required
        onChange={handleChange}
      />
      <Input
        label={t('checkout_form.street_address')}
        type="text"
        name="streetAddress"
        id="street_address"
        value={streetAddress}
        onChange={handleChange}
        required
      />
      <Input
        label={t('checkout_form.zip_code')}
        type="text"
        name="zipCode"
        id="zip_code"
        value={zipCode}
        onChange={handleChange}
        required
      />
      <Input label={t('checkout_form.city')} type="text" name="city" id="city" value={city} required onChange={handleChange} />

      <S.StateRow>
        <Input label={t('checkout_form.state')} type="text" name="state" id="state" value={state} required onChange={handleChange} />
        <Input
          label={t('checkout_form.country')}
          type="text"
          id="country"
          placeholder={t('checkout_form.country_placeholder')}
          name="country"
          value={country}
          onChange={handleChange}
          required
        />
      </S.StateRow>

      <div>
        <S.Title>{t('checkout_form.payment_method')}</S.Title>
      </div>

      <Input
        type="text"
        label={t('checkout_form.credit_card_number')}
        id="credit_card_number"
        name="creditCardNumber"
        placeholder={t('checkout_form.credit_card_number_placeholder')}
        value={creditCardNumber}
        onChange={handleChange}
        required
        pattern="\d{4}-\d{4}-\d{4}-\d{4}"
      />

      <S.CardRow>
        <Input
          label={t('checkout_form.month')}
          name="creditCardExpirationMonth"
          id="credit_card_expiration_month"
          value={creditCardExpirationMonth}
          onChange={handleChange}
          type="select"
        >
          {monthLabels.map((monthLabel, index) => (
            <option value={index + 1} key={monthLabel}>
              {monthLabel}
            </option>
          ))}
        </Input>
        <Input
          label={t('checkout_form.year')}
          name="creditCardExpirationYear"
          id="credit_card_expiration_year"
          value={creditCardExpirationYear}
          onChange={handleChange}
          type="select"
        >
          {yearList.map(year => (
            <option value={year} key={year}>
              {year}
            </option>
          ))}
        </Input>
        <Input
          label={t('checkout_form.cvv')}
          type="password"
          id="credit_card_cvv"
          name="creditCardCvv"
          value={creditCardCvv}
          required
          pattern="\d{3}"
          onChange={handleChange}
        />
      </S.CardRow>

      <S.SubmitContainer>
        <Link href="/">
          <S.CartButton $type="secondary">{t('common.continue_shopping')}</S.CartButton>
        </Link>
        <S.CartButton data-cy={CypressFields.CheckoutPlaceOrder} type="submit">{t('checkout_form.place_order')}</S.CartButton>
      </S.SubmitContainer>
    </S.CheckoutForm>
  );
};

export default CheckoutForm;
