import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { base_path } from './environment';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../src/style/css/feather.css';
import '../src/index.scss';
import store from './core/data/redux/store';
import { Provider } from 'react-redux';
import '../src/style/icon/boxicons/boxicons/css/boxicons.min.css';
import '../src/style/icon/weather/weathericons.css';
import '../src/style/icon/typicons/typicons.css';
import '../src/style/icon/fontawesome/css/fontawesome.min.css';
import '../src/style/icon/fontawesome/css/all.min.css';
import '../src/style/icon/ionic/ionicons.css';
import '../src/style/icon/tabler-icons/webfont/tabler-icons.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import '../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js';
import ThemeSettings from './core/common/theme-settings';

// ✅ META PIXEL INTEGRATION
import ReactPixel from 'react-facebook-pixel';

const PIXEL_ID = '1367496575453255';

const pixelOptions = {
  autoConfig: true,
  debug: process.env.NODE_ENV === 'development',
};

ReactPixel.init(PIXEL_ID, undefined, pixelOptions);
ReactPixel.pageView();

console.log('✅ Meta Pixel initialized with ID:', PIXEL_ID);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={base_path}>
        <AuthProvider>
          <App />
          <ThemeSettings />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
