// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import * as S from './ProductReviews.styled';
import { useProductReview } from '../../providers/ProductReview.provider';
import { useAiAssistant } from '../../providers/ProductAIAssistant.provider';
import React, { useState, useMemo } from 'react';
import { CypressFields } from '../../utils/enums/CypressFields';
import { useTranslation } from '../../utils/i18n';

const clamp = (n: number, min = 0, max = 5) => Math.max(min, Math.min(max, n));

const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => {
  const rounded = clamp(Math.round(value), 0, max);
  const stars = Array.from({ length: max }, (_, i) => (i < rounded ? '★' : '☆')).join(' ');
  return <S.StarRating aria-label={`${value.toFixed(1)} out of ${max} stars`}>{stars}</S.StarRating>;
};

const ProductReviews = () => {
    const { t } = useTranslation();
    const { productReviews, loading, error, averageScore } = useProductReview();

    const average = useMemo(() => {
        if (!averageScore) return null;
        return clamp(Number(averageScore));
    }, [averageScore]);

    const distribution = useMemo(() => {
        if (!Array.isArray(productReviews)) return [0, 0, 0, 0, 0];
        const counts = [0, 0, 0, 0, 0];
        for (const r of productReviews) {
            const s = clamp(Math.round(Number(r.score)), 1, 5); // round first, clamp to [1,5]
            counts[s - 1] += 1;
        }
        return counts;
    }, [productReviews]);

    const normalizedPercents = useMemo(() => {
        if (!Array.isArray(productReviews) || productReviews.length === 0) return [0, 0, 0, 0, 0];

        const raw = distribution.map(c => (c / productReviews.length) * 100);
        const floored = raw.map(p => Math.floor(p));
        const sumFloors = floored.reduce((a, b) => a + b, 0);
        let remainder = 100 - sumFloors;

        const order = raw
            .map((p, i) => ({ i, frac: p - Math.floor(p) }))
            .sort((a, b) => b.frac - a.frac);

        const final = floored.slice();
        for (let k = 0; k < remainder; k++) {
            final[order[k].i] += 1;
        }
        return final;
    }, [distribution, productReviews]);

    // AI Assistant (provider-driven)
    const [aiQuestion, setAiQuestion] = useState('');
    const { sendAiRequest, aiResponse, aiLoading, aiError, reset } = useAiAssistant();

    const handleAskAI = (questionOverride?: string) => {
        const q = (questionOverride ?? aiQuestion).trim();
        if (!q) return;
        reset(); // optional: clears previous result
        sendAiRequest({ question: q });
    };

    const handleQuickPrompt = (prompt: string) => {
        setAiQuestion(prompt);
        handleAskAI(prompt);
    };

  return (
    <S.ProductReviews aria-live="polite" data-cy={CypressFields.ProductReviews}>

        <S.AskAISection aria-label={t('product.ask_assistant')} data-cy="AskAISection">
            <S.AskAIHeader>{t('product.ask_assistant')}</S.AskAIHeader>

            <S.AskAIInputRow>
                <S.AskAIInput
                    id="ask-ai-input"
                    type="text"
                    placeholder={t('product.ai_placeholder')}
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !aiLoading && aiQuestion.trim()) {
                            handleAskAI();
                        }
                    }}
                    aria-label={t('product.ai_placeholder')}
                    data-cy="AskAIInput"
                />
                <S.AskAIButton
                    type="button"
                    onClick={() => handleAskAI()}
                    disabled={aiLoading || !aiQuestion.trim()}
                    aria-busy={aiLoading ? 'true' : 'false'}
                    data-cy="AskAIButton"
                >
                    {aiLoading ? t('product.ai_loading') : t('product.ask')}
                </S.AskAIButton>
            </S.AskAIInputRow>

            <S.AskAIControls>
                <S.QuickPromptButton
                    type="button"
                    onClick={() => handleQuickPrompt(t('product.quick_prompt_summarize'))}
                    data-cy="QuickPromptSummarize"
                >
                    {t('product.quick_prompt_summarize')}
                </S.QuickPromptButton>

                <S.QuickPromptButton
                    type="button"
                    onClick={() => handleQuickPrompt(t('product.quick_prompt_ages'))}
                    data-cy="QuickPromptAges"
                >
                    {t('product.quick_prompt_ages')}
                </S.QuickPromptButton>

                <S.QuickPromptButton
                    type="button"
                    onClick={() => handleQuickPrompt(t('product.quick_prompt_negative'))}
                    data-cy="QuickPromptNegative"
                >
                    {t('product.quick_prompt_negative')}
                </S.QuickPromptButton>
            </S.AskAIControls>

            {aiError && (
                <S.AIMessage role="alert" data-cy="AIError">
                    {aiError.message ?? t('product.ai_error')}
                </S.AIMessage>
            )}

            {aiResponse && (
                <S.AIMessage aria-live="polite" data-cy="AIAnswer">
                    <strong>{t('product.ai_response')}</strong>{' '}
                    {typeof aiResponse === 'string' ? aiResponse : aiResponse.text}
                </S.AIMessage>
            )}
        </S.AskAISection>


      <S.TitleContainer>
        <S.Title>{t('product.reviews')}</S.Title>
      </S.TitleContainer>

        {loading && <p>{t('product.loading')}</p>}

        {!loading && error && <p>{t('product.reviews_error')}</p>}

        {!loading && !error && Array.isArray(productReviews) && productReviews.length === 0 && (
        <p>{t('product.no_reviews')}</p>
        )}

        {!loading && !error && (
            <>
                {(average != null) && (
                    <S.SummaryCard>
                        {average != null && (
                            <>
                                <S.AverageBlock>
                                    <S.AverageScoreBadge>{average.toFixed(1)}</S.AverageScoreBadge>
                                    <StarRating value={average} />
                                    <S.ScoreCount>
                                        {Array.isArray(productReviews) ? `${productReviews.length} ${t('product.review_count')}` : ''}
                                    </S.ScoreCount>
                                </S.AverageBlock>

                                {Array.isArray(productReviews) && productReviews.length > 0 && (
                                    <S.ScoreDistribution>
                                        {[1, 2, 3, 4, 5].map((score, idx) => {
                                            const pct = normalizedPercents[idx];
                                            return (
                                                <S.ScoreRow key={`score-${score}`}>
                                                    <S.ScoreLabel>
                                                        {score} {score > 1 ? t('product.stars') : t('product.star')}
                                                    </S.ScoreLabel>
                                                    <S.ScoreBar aria-label={`${score} stars: ${pct}%`}>
                                                        <S.ScoreBarFill style={{ width: `${pct}%` }} />
                                                    </S.ScoreBar>
                                                    <S.ScorePct>{pct}%</S.ScorePct>
                                                </S.ScoreRow>
                                            );
                                        })}
                                    </S.ScoreDistribution>
                                )}
                            </>
                        )}
                    </S.SummaryCard>
                )}

          {Array.isArray(productReviews) && productReviews.length > 0 && (
            <S.ReviewsGrid as="ul">
              {productReviews.map((review, idx) => (
                <S.ReviewCard as="li" key={`${review.username}-${review.score}-${idx}`}>
                  <S.ReviewHeader>
                    <S.ReviewerName>{review.username}</S.ReviewerName>
                    <StarRating value={Number(review.score) || 0} />
                  </S.ReviewHeader>
                  <S.ReviewBody>
                    {review.description || t('product.no_description')}
                  </S.ReviewBody>
                </S.ReviewCard>
              ))}
            </S.ReviewsGrid>
          )}
        </>
      )}
    </S.ProductReviews>
  );
};

export default ProductReviews;
