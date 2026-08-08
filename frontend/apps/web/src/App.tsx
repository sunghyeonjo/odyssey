import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import OAuthCallbackPage from '@/pages/OAuthCallbackPage'
import FeedPage from '@/pages/FeedPage'
import TradeListPage from '@/pages/TradeListPage'
import JournalListPage from '@/pages/JournalListPage'
import UserProfilePage from '@/pages/UserProfilePage'
import MyPage from '@/pages/MyPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<FeedPage />} />
              <Route path="/trades" element={<TradeListPage />} />
              <Route path="/journals" element={<JournalListPage />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/users/:userId" element={<UserProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
