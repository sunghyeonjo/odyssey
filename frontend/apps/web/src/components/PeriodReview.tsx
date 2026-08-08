import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PeriodReview } from '@buffett-diary/shared'
import { tradesApi } from '@/api/trades'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabFilter } from '@/components/ui/tab-filter'

type ReviewType = 'weekly' | 'monthly'

const REVIEW_OPTIONS: { value: ReviewType; label: string }[] = [
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
]

function formatProfit(value: number): string {
  return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`
}

export default function PeriodReviewSection() {
  const [reviewType, setReviewType] = useState<ReviewType>('weekly')

  const { data: review, isLoading } = useQuery<PeriodReview>({
    queryKey: ['review', reviewType],
    queryFn: () => tradesApi.review(reviewType).then((r) => r.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">리뷰</h2>
        <TabFilter options={REVIEW_OPTIONS} value={reviewType} onChange={setReviewType} />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}

      {review && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {review.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {review.totalTrades === 0 ? (
              <p className="text-sm text-muted-foreground">이 기간에 거래가 없습니다.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">거래</p>
                    <p className="text-lg font-bold">{review.totalTrades}건</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">손익</p>
                    <p className={`text-lg font-bold ${review.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatProfit(review.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">승률</p>
                    <p className="text-lg font-bold">
                      {review.winRate.toFixed(1)}%
                      {review.winRateChange != null && (
                        <span className={`ml-1 text-xs ${review.winRateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {review.winRateChange >= 0 ? '+' : ''}{review.winRateChange.toFixed(1)}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  {review.topPerformer && (
                    <div>
                      <p className="text-xs text-muted-foreground">최고 종목</p>
                      <p className="font-medium text-green-600">{review.topPerformer}</p>
                    </div>
                  )}
                  {review.worstPerformer && (
                    <div>
                      <p className="text-xs text-muted-foreground">최저 종목</p>
                      <p className="font-medium text-red-600">{review.worstPerformer}</p>
                    </div>
                  )}
                  {review.mostTradedTicker && (
                    <div>
                      <p className="text-xs text-muted-foreground">최다 거래</p>
                      <p className="font-medium">{review.mostTradedTicker}</p>
                    </div>
                  )}
                </div>

              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
