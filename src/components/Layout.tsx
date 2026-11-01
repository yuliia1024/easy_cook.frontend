import { NavLink, Outlet, useMatch } from 'react-router';
import { BowlIcon } from './icons';

const LINKS = [
  { to: '/chat', label: 'Chat' },
  { to: '/menus', label: 'Menus' },
  { to: '/profile', label: 'Profile & goals' },
  { to: '/preferences', label: 'Preferences' },
  { to: '/foods', label: 'Foods' },
  { to: '/recipes', label: 'Recipes' },
];

export function Layout() {
  // The chat and the menus are two-column workspaces and get a wider canvas than the other pages.
  const chat = useMatch('/chat/*');
  const menus = useMatch('/menus/*');
  const wide = chat ?? menus;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-sage-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3.5 sm:px-8">
          <NavLink to="/" className="flex items-center gap-2.5 text-lg font-bold text-brand-700">
            <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-brand-700 text-white">
              <BowlIcon size={18} />
            </span>
            Easy Cook
          </NavLink>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'font-medium text-sage-600 hover:bg-sage-100 hover:text-sage-900'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main
        className={`mx-auto w-full flex-1 px-4 sm:px-8 ${wide ? 'max-w-7xl py-7' : 'max-w-[1120px] pt-9 pb-12'}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
