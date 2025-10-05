import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Bio from '../pages/Bio';
import PropTypes from 'prop-types';

const AppRouter = ({ isDark, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<Home isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Bio.jsx" element={<Bio />} />
            {/* Agrega más rutas según sea necesario */}
            <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
    );
};

AppRouter.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default AppRouter;
