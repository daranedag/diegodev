import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WebsitePreview from '../Portfolio/WebsitePreview';
import { getProjects } from '../../data/projects';

const ProjectCard = ({ title, description, link, previewTitle, gradient }) => {
    return (
        <div className="group">
            <Link to={link} target="_blank" rel="noopener noreferrer" className="no-underline">
                <div className="w-full aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-md hover:shadow-xl transition-shadow duration-300">
                    <div className="w-full h-48 relative overflow-hidden">
                        <div
                            className={`absolute inset-0 w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                        >
                            <span className="text-white font-semibold text-xl">{title}</span>
                        </div>
                        {link && (
                            <WebsitePreview url={link} title={previewTitle} variant="featured" />
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
            </Link>
        </div>
    );
};

const FeaturedWork = () => {
    const { t } = useTranslation();
    const projects = getProjects(t).slice(0, 5);

    return (
        <section className="mt-24" id="work">
            <h2 className="text-3xl font-bold tracking-tight text-center text-gray-900 dark:text-gray-100">
                {t('work.title')}
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                    <ProjectCard
                        key={project.id}
                        title={project.title}
                        description={project.description}
                        gradient={project.gradient}
                        link={project.productionLink}
                        previewTitle={t('portfolio.previewTitle', { title: project.title })}
                    />
                ))}
            </div>
        </section>
    );
};

export default FeaturedWork;
