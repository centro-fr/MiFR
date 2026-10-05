import { Routes, Route } from 'react-router-dom';
import { ActividadesPage } from './pages/ActividadesPage';

export function App() {
  return (
    <Routes>
      <Route path="/actividades" element={<ActividadesPage />} />
      {/* Podés agregar el resto de tus rutas acá */}
    </Routes>
  );
}

export default App;