import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import CategoryList from './pages/CategoryList';
import CategoryDetail from './pages/CategoryDetail';
import Sidebar from './components/Sidebar';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FavoritesProvider>
      <DataProvider>
        <HashRouter>
          <div className="app-layout">
            <div className="main-content">
              <Routes>
                <Route path="/" element={<CategoryList />} />
                <Route path="/category/:name" element={<CategoryDetail />} />
              </Routes>
            </div>
            <Sidebar />
          </div>
        </HashRouter>
      </DataProvider>
    </FavoritesProvider>
  </StrictMode>
);
