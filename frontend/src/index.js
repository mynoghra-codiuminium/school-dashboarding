import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SchoolYearProvider } from './context/SchoolYearContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SchoolYearProvider>
        <App />
      </SchoolYearProvider>
    </AuthProvider>
  </React.StrictMode>
);
