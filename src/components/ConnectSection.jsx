import React from 'react';
import { Link } from 'react-router-dom';
import {
    EnvelopeIcon,
    CodeBracketIcon,
    ChatBubbleLeftRightIcon,
    CameraIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';

// Mapeo de iconos
const iconMap = {
    LinkedIn: UserGroupIcon,
    GitHub: CodeBracketIcon,
    Twitter: ChatBubbleLeftRightIcon,
    Email: EnvelopeIcon,
    Instagram: CameraIcon,
};

const redes = [
    { nombre: "LinkedIn", enlace: "https://www.linkedin.com/in/daranedag/", color: "bg-blue-600 hover:bg-blue-700" },
    { nombre: "Email", enlace: "mailto:daranedag@gmail.com", color: "bg-red-600 hover:bg-red-700" },
    { nombre: "GitHub", enlace: "https://github.com/daranedag/", color: "bg-gray-800 hover:bg-gray-900" },
    { nombre: "Twitter", enlace: "https://x.com/mr_diegui", color: "bg-sky-500 hover:bg-sky-600" },
    { nombre: "Instagram", enlace: "https://www.instagram.com/mrdiegui/", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 hover:from-yellow-500 hover:via-pink-600 hover:to-purple-700" },
];

const ConnectCard = ({ nombre, link, color }) => {
    const Icon = iconMap[nombre];

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block no-underline"
        >
            <div className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className={`${color} w-full h-20 flex items-center justify-center transition-all duration-300`}>
                    {Icon && <Icon className="w-10 h-10 text-white" />}
                </div>
                <div className="p-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {nombre}
                    </h3>
                </div>
            </div>
        </a>
    );
}

const ConnectSection = () => {
    return (
        <section id="ConnectSection" className="mt-24 scroll-mt-20">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Conectemos
                </h2>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                    Siempre estoy dispuesto a nuevas oportunidades y colaboraciones.
                    No dudes en contactarme!
                </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                {redes.map((red, index) => (
                    <ConnectCard
                        key={index}
                        nombre={red.nombre}
                        link={red.enlace}
                        color={red.color}
                    />
                ))}
            </div>
        </section>
    );
}

export default ConnectSection;