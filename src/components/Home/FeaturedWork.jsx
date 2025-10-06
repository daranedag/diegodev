import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import fotoChilcos from '../../../assets/img/chilcos.png';
import fotoIdeaGarden from '../../../assets/img/ideaGarden.png';
import fotoObserva from '../../../assets/img/observa.png';

const ProjectCard = ({ title, description, link, img, gradient }) => {
    return (
        <div className="group">
            <Link to={link} target="_blank" rel="noopener noreferrer" className="no-underline">
                <div className="w-full aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-md hover:shadow-xl transition-shadow duration-300">
                    <div className="w-full h-48 relative overflow-hidden">
                        {/* Texto por defecto */}
                        <div
                            className={`absolute inset-0 w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center transition-opacity duration-600 group-hover:opacity-0`}
                        >
                            <span className="text-white font-semibold text-xl">{title}</span>
                        </div>
                        {/* Imagen al hacer hover */}
                        <img
                            src={img}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-600"
                        />
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
    const projects = [
        {
            title: t('work.backendIdeaGarden.title'),
            description: t('work.backendIdeaGarden.description'),
            gradient: 'from-purple-700 to-blue-500',
            link: 'https://www.idea-garden.xyz/',
            img: fotoIdeaGarden
        },
        {
            title: t('work.chilcos.title'),
            description: t('work.chilcos.description'),
            gradient: 'from-purple-500 to-purple-700',
            link: 'https://www.chilcos.org',
            img: fotoChilcos,
        },
        {
            title: t('work.observaLosRios.title'),
            description: t('work.observaLosRios.description'),
            gradient: 'from-blue-500 to-purple-600',
            link: 'https://www.observalosrios.cl',
            img: fotoObserva
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
                        img={project.img}
                    />
                ))}
            </div>
        </section>
    );
};

export default FeaturedWork;
