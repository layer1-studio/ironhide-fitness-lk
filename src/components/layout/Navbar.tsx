import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/facilities', label: 'Facilities' },
    { to: '/membership', label: 'Plans' },
    { to: '/occupancy', label: 'Gym Status' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-surface-container-highest bg-surface">
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

        <button className="md:hidden text-on-surface" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-surface-container-highest px-margin-mobile py-4 flex flex-col gap-4">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="text-on-surface hover:text-primary-container text-body-md font-body">{link.label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-on-surface text-body-md font-body">Dashboard</Link>
              <Link to="/id-card" onClick={() => setMenuOpen(false)} className="text-on-surface text-body-md font-body">My ID</Link>
              <Link to="/fitness" onClick={() => setMenuOpen(false)} className="text-on-surface text-body-md font-body">Fitness</Link>
              <button onClick={() => { handleSignOut(); setMenuOpen(false); }} className="text-left text-on-surface text-body-md font-body">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="text-on-surface text-body-md font-body">Member Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="bg-primary-container text-on-primary-container px-4 py-2 font-display text-center">JOIN NOW</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
