import PropTypes from 'prop-types';
import WebsitePreview from './WebsitePreview';

const Project = ({ title, description, websiteUrl, previewTitle, onClick, type }) => {
    // Determinar los badges a mostrar según el tipo
    const badges = [];
    if (type === 'frontend' || type === 'fullstack') {
        badges.push({ label: 'Frontend', color: 'bg-blue-500' });
    }
    if (type === 'backend' || type === 'fullstack') {
        badges.push({ label: 'Backend', color: 'bg-green-500' });
    }

    return (
        <div
            className="group relative overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            onClick={onClick}
        >
            <div className="relative aspect-[9/3] w-full overflow-hidden">
                {websiteUrl ? (
                    <WebsitePreview url={websiteUrl} title={previewTitle} />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-500 px-6 transition-transform duration-300 group-hover:scale-105">
                        <span className="text-center text-xl font-semibold tracking-wide text-white drop-shadow-sm">
                            {title}
                        </span>
                    </div>
                )}
            </div>
            <div className="p-6 relative">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                    {title}
                </h3>
                <p className="mt-2 text-sm text-text-light/70 dark:text-text-dark/70">
                    {description}
                </p>
                <div className="flex items-center justify-between mt-3">
                    <span className="inline-block text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Ver detalles →
                    </span>
                    {/* Badges en la esquina inferior derecha */}
                    {badges.length > 0 && (
                        <div className="flex gap-2">
                            {badges.map((badge, index) => (
                                <span
                                    key={index}
                                    className={`${badge.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}
                                >
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

Project.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    websiteUrl: PropTypes.string,
    previewTitle: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['frontend', 'backend', 'fullstack']),
};

export default Project;
