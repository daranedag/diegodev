import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Bio from '../pages/Bio';
import CV from '../pages/CV';
import NotFound from '../pages/NotFound';
import PropTypes from 'prop-types';

const AppRouter = ({ isDark, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<Home isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Bio.jsx" element={<Bio isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/CV.jsx" element={<CV isDark={isDark} toggleTheme={toggleTheme} />} />
            {/* Agrega más rutas según sea necesario */}
            <Route path="*" element={<NotFound isDark={isDark} toggleTheme={toggleTheme} />} />
        </Routes>
    );
};

AppRouter.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default AppRouter;
