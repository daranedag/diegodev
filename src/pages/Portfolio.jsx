import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Project from '../components/Portfolio/Project';
import ProjectModal from '../components/Portfolio/ProjectModal';
import PropTypes from 'prop-types';
import fotoChilcos from '../../assets/img/chilcos.png';
import fotoIdeaGarden from '../../assets/img/ideaGarden.png';
import fotoObserva from '../../assets/img/observa.png';

const Portfolio = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const projects = [
        {
            title: t('portfolio.project1.title'),
            description: t('portfolio.project1.description'),
            detailedDescription: t('portfolio.project1.detailedDescription'),
            imageUrl: fotoIdeaGarden,
            githubLink: t('portfolio.project1.githubLink'),
            productionLink: t('portfolio.project1.productionLink'),
            technologies: t('portfolio.project1.technologies', { returnObjects: true }),
            type: 'backend'
        },
        {
            title: t('portfolio.project2.title'),
            description: t('portfolio.project2.description'),
            detailedDescription: t('portfolio.project2.detailedDescription'),
            imageUrl: fotoChilcos,
            githubLink: t('portfolio.project2.githubLink'),
            productionLink: t('portfolio.project2.productionLink'),
            technologies: t('portfolio.project2.technologies', { returnObjects: true }),
            type: 'frontend'
        },
        {
            title: t('portfolio.project3.title'),
            description: t('portfolio.project3.description'),
            detailedDescription: t('portfolio.project3.detailedDescription'),
            imageUrl: fotoObserva,
            githubLink: t('portfolio.project3.githubLink'),
            productionLink: t('portfolio.project3.productionLink'),
            technologies: t('portfolio.project3.technologies', { returnObjects: true }),
            type: 'fullstack'
        }
    ];

    const handleOpenModal = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProject(null);
    };
    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />
                <main className="flex-grow">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-10">
                        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-light dark:text-text-dark">{t('portfolio.title')}</h1>
                            <p className="mt-6 text-lg text-text-light/70 dark:text-text-dark/70">{t('portfolio.description')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {projects.map((project, index) => (
                                <Project
                                    key={index}
                                    title={project.title}
                                    description={project.description}
                                    imageUrl={project.imageUrl}
                                    onClick={() => handleOpenModal(project)}
                                    type={project.type}
                                />
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            {/* Modal */}
            <ProjectModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                project={selectedProject}
            />
        </>
    );
};

Portfolio.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Portfolio;
