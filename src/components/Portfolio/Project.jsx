import PropTypes from 'prop-types';

const Project = ({ title, description, imageUrl, onClick, type, statusLabel }) => {
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
                {imageUrl ? (
                    <div className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url("${imageUrl}")` }}></div>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-500 px-6 transition-transform duration-300 group-hover:scale-105">
                        <span className="text-center text-xl font-semibold tracking-wide text-white drop-shadow-sm">
                            {title}
                        </span>
                    </div>
                )}
                {statusLabel && (
                    <span className="absolute right-3 top-3 rounded-full bg-amber-100/95 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
                        {statusLabel}
                    </span>
                )}
            </div>
            <div className="p-6 relative">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">{title}</h3>
                <p className="mt-2 text-sm text-text-light/70 dark:text-text-dark/70">{description}</p>
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
    imageUrl: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['frontend', 'backend', 'fullstack']),
    statusLabel: PropTypes.string,
};

export default Project;
