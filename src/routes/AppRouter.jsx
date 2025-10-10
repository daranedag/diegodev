import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Bio from '../pages/Bio';
import CV from '../pages/CV';
import Portfolio from '../pages/Portfolio';
import Blog from '../pages/Blog';
import BlogPost from '../pages/BlogPost';
import NotFound from '../pages/NotFound';
import PropTypes from 'prop-types';

const AppRouter = ({ isDark, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<Home isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Bio.jsx" element={<Bio isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/CV.jsx" element={<CV isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Portfolio.jsx" element={<Portfolio isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Blog.jsx" element={<Blog isDark={isDark} toggleTheme={toggleTheme} />} />
            <Route path="/pages/Blog/:slug" element={<BlogPost isDark={isDark} toggleTheme={toggleTheme} />} />
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
