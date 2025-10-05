import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ProjectCard = ({ title, description, gradient, link }) => {
    return (
        <div className="group">
            <Link to={link} target="_blank" rel="noopener noreferrer" className="no-underline">
                <div className="w-full aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                    <div
                        className={`w-full h-48 bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform duration-300 flex items-center justify-center`}
                    >
                        <span className="text-white font-semibold">{title}</span>
                    </div>
                </div>
                <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
            </Link>
        </div>
    );
};

const FeaturedWork = () => {
    const { t } = useTranslation();
    const projects = [
        {
            title: t('work.backendIdeaGarden.title'),
            description: t('work.backendIdeaGarden.description'),
            gradient: 'from-purple-700 to-blue-500',
            link: 'https://www.idea-garden.xyz/',
        },
        {
            title: t('work.chilcos.title'),
            description: t('work.chilcos.description'),
            gradient: 'from-purple-500 to-purple-700',
            link: 'https://www.chilcos.org',
        },
        {
            title: t('work.observaLosRios.title'),
            description: t('work.observaLosRios.description'),
            gradient: 'from-blue-500 to-purple-600',
            link: 'https://www.observalosrios.cl',
        }
    ];

    return (
        <section className="mt-24" id="work">
            <h2 className="text-3xl font-bold tracking-tight text-center text-gray-900 dark:text-gray-100">
                {t('work.title')}
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                    <ProjectCard
                        key={index}
                        title={project.title}
                        description={project.description}
                        gradient={project.gradient}
                        link={project.link}
                    />
                ))}
            </div>
        </section>
    );
};

export default FeaturedWork;
