import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {/* Top bar */}
      <line
        x1="3" y1="6" x2="21" y2="6"
        style={{
          transformOrigin: '50% 6px',
          transition: 'transform 0.25s ease',
          transform: open ? 'translateY(6px) rotate(45deg)' : 'none',
        }}
      />
      {/* Middle bar */}
      <line
        x1="3" y1="12" x2="21" y2="12"
        style={{
          transition: 'opacity 0.15s ease',
          opacity: open ? 0 : 1,
        }}
      />
      {/* Bottom bar */}
      <line
        x1="3" y1="18" x2="21" y2="18"
        style={{
          transformOrigin: '50% 18px',
          transition: 'transform 0.25s ease',
          transform: open ? 'translateY(-6px) rotate(-45deg)' : 'none',
        }}
      />
    </svg>
  );
}

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/facilities', label: 'Facilities' },
    { to: '/membership', label: 'Plans' },
    { to: '/occupancy', label: 'Gym Status' },
    { to: '/announcements', label: 'News' },
    { to: '/contact', label: 'Contact' },
  ];

  const close = () => setMenuOpen(false);

  return (
    <header ref={menuRef} className="sticky top-0 z-50 border-b border-surface-container-highest bg-surface" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container mx-auto">
        <Link to="/" className="font-display text-headline-md text-on-surface uppercase tracking-wider">IRONHIDE</Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `font-body text-body-md transition-all duration-200 hover:scale-105 ${isActive ? 'text-primary-container font-bold border-b-2 border-primary-container pb-1' : 'text-on-surface hover:text-primary-container'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-on-surface-variant hover:text-on-surface text-body-md font-body transition-colors">Dashboard</Link>
              <Link to="/id-card" className="text-on-surface-variant hover:text-on-surface text-body-md font-body transition-colors">My ID</Link>
              <Link to="/fitness" className="text-on-surface-variant hover:text-on-surface text-body-md font-body transition-colors">Fitness</Link>
              <button onClick={handleSignOut} className="text-on-surface-variant hover:text-on-surface text-body-md font-body transition-colors">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-on-surface hover:text-primary-container text-body-md font-body transition-colors">MEMBER LOGIN</Link>
              <Link to="/signup" className="bg-primary-container text-on-primary-container px-6 py-2 font-display text-body-md hover:scale-105 transition-all active:scale-95">JOIN NOW</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-on-surface p-1"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </div>

      {/* Mobile menu — slide down */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: menuOpen ? '600px' : '0px', opacity: menuOpen ? 1 : 0 }}
      >
        <div className="bg-surface border-t border-surface-container-highest px-margin-mobile py-4 flex flex-col gap-4">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={close} className="text-on-surface hover:text-primary-container text-body-md font-body transition-colors">{link.label}</Link>
          ))}
          <div className="border-t border-surface-container-highest pt-4 flex flex-col gap-4">
            {user ? (
              <>
                <Link to="/dashboard" onClick={close} className="text-on-surface text-body-md font-body">Dashboard</Link>
                <Link to="/id-card" onClick={close} className="text-on-surface text-body-md font-body">My ID</Link>
                <Link to="/fitness" onClick={close} className="text-on-surface text-body-md font-body">Fitness</Link>
                <button onClick={() => { handleSignOut(); close(); }} className="text-left text-on-surface text-body-md font-body">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={close} className="text-on-surface text-body-md font-body">Member Login</Link>
                <Link to="/signup" onClick={close} className="bg-primary-container text-on-primary-container px-4 py-3 font-display text-center uppercase">JOIN NOW</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
