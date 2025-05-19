import React from 'react';
import './LandingPage.css';

const LandingPage = () => {
  const bgUrl = process.env.PUBLIC_URL + '/background.jpg';
  return (
    <div
      className='landing-page'
      style={{ backgroundImage: `url(${bgUrl})` }}
    />
  );
};

export default LandingPage;
