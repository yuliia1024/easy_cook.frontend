import { NavLink, Outlet } from 'react-router';

const LINKS = [
  { to: '/foods', label: 'Foods' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/profile', label: 'Profile & goals' },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-semibold text-green-800">
            Easy Cook
          </NavLink>
          <nav aria-label="Main navigation" className="flex gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-green-50 text-green-800' : 'text-stone-600 hover:bg-stone-100'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
