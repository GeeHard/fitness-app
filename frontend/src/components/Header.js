import React from 'react';
import { Link } from 'react-router-dom';
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
      <Link to='/' className='nav-link'>Home</Link>
      <Link to='/pushups' className='nav-link'>Pose</Link>
      <Link to='/pushups_js' className='nav-link'>Pose JS</Link>
      <Link to='/eval' className='nav-link'>Eval</Link>
    </nav>
  </header>
);

export default Header;
