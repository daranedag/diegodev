const projectDefinitions = [
    { id: 'project1', type: 'frontend', gradient: 'from-purple-700 to-blue-500' },
    { id: 'project2', type: 'frontend', gradient: 'from-purple-500 to-purple-700' },
    { id: 'project3', type: 'fullstack', gradient: 'from-amber-500 via-rose-500 to-purple-600' },
    { id: 'project4', type: 'frontend', gradient: 'from-emerald-700 to-teal-500' },
    { id: 'project5', type: 'fullstack', gradient: 'from-indigo-700 to-amber-600' },
];

export const getProjects = t =>
    projectDefinitions.map(project => ({
        ...project,
        title: t(`portfolio.${project.id}.title`),
        description: t(`portfolio.${project.id}.description`),
        detailedDescription: t(`portfolio.${project.id}.detailedDescription`),
        githubLink: t(`portfolio.${project.id}.githubLink`),
        productionLink: t(`portfolio.${project.id}.productionLink`),
        technologies: t(`portfolio.${project.id}.technologies`, { returnObjects: true }),
    }));
