import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import PushupsPage from './components/PushupsPage';
import PushupsJsPage from './components/PushupsJsPage';
import EvalPage from './components/EvalPage';

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/pushups' element={<PushupsPage />} />
        <Route path='/pushups_js' element={<PushupsJsPage />} />
        <Route path='/eval' element={<EvalPage />} />
      </Routes>
    </div>
  );
}

export default App;
