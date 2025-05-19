import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => (
  <header className='header'>
    <nav className='nav'>
      <Link to='/' className='nav-link'>Home</Link>
      <Link to='/pushups' className='nav-link'>Pushups</Link>
    </nav>
  </header>
);

export default Header;
