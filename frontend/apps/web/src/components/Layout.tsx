import { Link, Outlet } from 'react-router-dom'
import ProfileMenu from '@/components/ProfileMenu'

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar — logo only, add nav items here as pages are added */}
      <aside className="hidden w-56 flex-col border-r bg-card md:flex">
        <div className="px-5 py-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold">odyssey</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-background/95 backdrop-blur-sm px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-base font-bold">odyssey</span>
          </Link>
          <ProfileMenu />
        </header>

        {/* Desktop top bar — fixed above scroll area, no border */}
        <div className="hidden items-center justify-end gap-1.5 px-6 py-2.5 md:flex">
          <ProfileMenu />
        </div>

        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
