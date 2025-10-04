import { useTheme } from './hooks/useTheme';
import './App.css';
import UnderConstruction from './components/UnderConstruction';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';

function App() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <>
            <BrowserRouter>
                <AppRouter />
            </BrowserRouter>
        </>
    );
}

export default App;
