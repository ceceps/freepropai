import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import {
  Menu, Sun, Moon, Home, Users, MessageSquare,
  LayoutDashboard, ChevronLeft, ChevronRight, Bell,
  User, Search, Grid, LogOut, Settings
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Follow-ups', href: '/followups', icon: MessageSquare },
  { name: 'Listings', href: '/listings', icon: Home },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && !(event.target as HTMLElement).closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const currentPath = location.pathname;
  const currentNav = navigation.find(n => currentPath === n.href) || navigation[0];

  return (
    <div className="min-h-screen bg-bg-primary dark:bg-bg-primary-dark transition-colors duration-200">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Layout wrapper - flex container */}
      <div className="flex min-h-screen" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Sidebar */}
        <aside
          className={`z-50 bg-surface dark:bg-surface border-r border-border dark:border-border transition-all duration-300 ease-out flex-shrink-0 ${
            isMobile
              ? 'fixed inset-y-0 left-0 transform lg:relative lg:translate-x-0'
              : 'sticky top-0 h-screen relative'
          } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
          style={{
            width: sidebarOpen ? 256 : 80,
            transform: isMobile && !mobileMenuOpen ? 'translateX(-100%)' : undefined,
          }}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border dark:border-border">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <Grid className="w-5 h-5 text-white" />
                </div>
                {sidebarOpen && (
                  <span className="text-xl font-bold text-text-primary dark:text-text-primary truncate">
                    FreePropAI
                  </span>
                )}
              </Link>
              {!isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors flex-shrink-0"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-text-secondary" /> : <ChevronRight className="w-5 h-5 text-text-secondary" />}
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-text-secondary dark:text-text-secondary hover:bg-secondary-100 dark:hover:bg-secondary-800'
                    }`}
                    title={sidebarOpen ? undefined : item.name}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {sidebarOpen && <span className="font-medium truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </nav>

            {/* Bottom section - User & Theme */}
            <div className="p-3 border-t border-border dark:border-border">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-text-primary truncate">Admin User</p>
                    <p className="text-xs text-text-tertiary dark:text-text-tertiary truncate">admin@freepropai.com</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={toggleTheme}
                  className="flex-1 p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5 text-text-secondary dark:text-text-secondary mx-auto" />
                  ) : (
                    <Sun className="w-5 h-5 text-warning-500 mx-auto" />
                  )}
                </button>
                {sidebarOpen && (
                  <span className="text-xs text-text-tertiary dark:text-text-tertiary px-2">
                    {theme === 'light' ? 'Light' : 'Dark'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 transition-all duration-300">
          {/* Top Navigation */}
          <header className="sticky top-0 z-30 bg-bg-primary/80 dark:bg-bg-primary-dark/80 backdrop-blur-sm border-b border-border dark:border-border">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {mobileMenuOpen ? <ChevronRight className="w-6 h-6 text-text-primary" /> : <Menu className="w-6 h-6 text-text-primary" />}
                </button>
                {sidebarOpen && !isMobile && (
                  <h1 className="text-lg font-semibold text-text-primary dark:text-text-primary hidden sm:block">
                    {currentNav.name}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary dark:text-text-tertiary" />
                  <input
                    type="search"
                    placeholder="Search..."
                    className="w-64 pl-10 pr-4 py-2 bg-secondary-100 dark:bg-secondary-800 border border-border dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-text-tertiary dark:placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                  <Bell className="w-5 h-5 text-text-secondary dark:text-text-secondary" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                </button>

                {/* Theme toggle for mobile */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors lg:hidden"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon className="w-5 h-5 text-text-secondary" /> : <Sun className="w-5 h-5 text-warning-500" />}
                </button>

                {/* User menu */}
                <div className="user-menu relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 pl-3 pr-4 py-2 border-l border-border dark:border-border hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors rounded-r-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-text-primary dark:text-text-primary">Admin</p>
                      <p className="text-xs text-text-tertiary dark:text-text-tertiary">Administrator</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary dark:text-text-tertiary hidden lg:block" />
                  </button>

                  {showUserMenu && (
                    <div className="dropdown">
                      <div className="px-4 py-3 border-b border-border dark:border-border">
                        <p className="text-sm font-medium text-text-primary dark:text-text-primary">Admin User</p>
                        <p className="text-xs text-text-tertiary dark:text-text-tertiary">admin@freepropai.com</p>
                      </div>
                      <button className="dropdown-item w-full text-left">
                        <User className="w-4 h-4" />
                        Profile
                      </button>
                      <button className="dropdown-item w-full text-left">
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="dropdown-divider" />
                      <button className="dropdown-item w-full text-left text-danger-600 dark:text-danger-400">
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">
            <div className="max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}