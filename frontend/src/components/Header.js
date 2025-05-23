import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => (
  <header className='header'>
    {/* Logo on the left */}
    <img
      src={`${process.env.PUBLIC_URL}/My_logo.png`}
      alt='Logo'
      className='logo'
    />
    <nav className='nav'>
      <NavLink to='/' className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
      <NavLink to='/pushups' className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>PushUp</NavLink>
      <NavLink to='/pushups_js' className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Pose JS</NavLink>
      <NavLink to='/eval' className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Eval</NavLink>
    </nav>
  </header>
);

export default Header;
