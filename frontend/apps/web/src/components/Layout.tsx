import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Rss, BookOpen, FileText, User } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ProfileMenu from '@/components/ProfileMenu'

const navItems = [
  { to: '/', label: '피드', icon: Rss },
  { to: '/trades', label: '매매 내역', icon: BookOpen },
  { to: '/journals', label: '투자일지', icon: FileText },
]

export default function Layout() {
  const location = useLocation()
  const isMyPage = location.pathname === '/mypage'

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar — logo + nav only */}
      <aside className="hidden w-56 flex-col border-r bg-card md:flex">
        <div className="px-5 py-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="dayed" className="h-7 w-7" />
            <span className="text-lg font-bold">dayed</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-background/95 backdrop-blur-sm px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/logo.svg" alt="dayed" className="h-6 w-6" />
            <span className="text-base font-bold">dayed</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        {/* Desktop top bar — fixed above scroll area, no border */}
        <div className="hidden items-center justify-end gap-1.5 px-6 py-2.5 md:flex">
          <NotificationBell />
          <ProfileMenu />
        </div>

        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background md:hidden">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
                isActive(to)
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
          <Link
            to="/mypage"
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
              isMyPage ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <User className="h-5 w-5" />
            MY
          </Link>
        </nav>
      </div>
    </div>
  )
}
