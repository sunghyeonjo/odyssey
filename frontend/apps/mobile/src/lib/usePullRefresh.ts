import { useCallback, useState } from 'react'

/**
 * 당겨서 새로고침 표시는 **손으로 당겼을 때만** 돈다.
 *
 * react-query 의 `isRefetching` 에 물리면 탭을 옮기거나 캐시가 무효화될 때마다
 * 화면 위에서 스피너가 튀어나온다 — 사용자가 시킨 적 없는 로딩이라 앱이 불안해 보인다.
 * 배경에서 새로 받아오는 건 조용히 지나가야 한다.
 */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch().finally(() => setRefreshing(false))
  }, [refetch])

  return { refreshing, onRefresh }
}
