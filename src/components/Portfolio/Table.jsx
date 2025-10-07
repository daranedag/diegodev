import React from 'react';
import PropTypes from 'prop-types';

const Table = ({ githubLink, productionLink, technologies }) => {
    const rows = [
        {
            label: 'Repositorio GitHub',
            value: githubLink ? (
                <a
                    href={githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                    Ver repositorio →
                </a>
            ) : 'No disponible'
        },
        {
            label: 'Sitio en Producción',
            value: productionLink ? (
                <a
                    href={productionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                >
                    Visitar sitio →
                </a>
            ) : 'No disponible'
        },
        {
            label: 'Tecnologías',
            value: technologies && technologies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {technologies.map((tech, index) => (
                        <span
                            key={index}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        >
                            {tech}
                        </span>
                    ))}
                </div>
            ) : 'No especificado'
        }
    ];

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200 w-1/3">
                                {row.label}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                {row.value}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

Table.propTypes = {
    githubLink: PropTypes.string,
    productionLink: PropTypes.string,
    technologies: PropTypes.arrayOf(PropTypes.string),
};

export default Table;
