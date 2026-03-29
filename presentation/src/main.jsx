import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import CategoryList from './pages/CategoryList';
import CategoryDetail from './pages/CategoryDetail';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<CategoryList />} />
          <Route path="/category/:name" element={<CategoryDetail />} />
        </Routes>
      </HashRouter>
    </DataProvider>
  </StrictMode>
);
