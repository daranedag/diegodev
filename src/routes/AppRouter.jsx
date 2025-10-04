import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import PropTypes from 'prop-types';

const AppRouter = ({ isDark, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<Home isDark={isDark} toggleTheme={toggleTheme} />} />
        </Routes>
    );
};

AppRouter.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default AppRouter;
