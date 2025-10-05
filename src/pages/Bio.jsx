import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';
import {
    CodeBracketIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    CameraIcon,
    EnvelopeIcon
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PropTypes from 'prop-types';
import FotoProfile from '../../assets/img/perfilNuevo.png';


const Bio = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />

                <main className="flex-1">
                    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-16">
                            <div className="flex flex-col items-center text-center md:items-start md:text-left">
                                <div className="relative mb-4 h-40 w-40 flex-shrink-0">
                                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-full w-full" style={{ backgroundImage: `url(${FotoProfile})` }}></div>
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">Diego Araneda</h1>
                                <p className="mt-2 text-lg text-[var(--foreground-muted)]">Ingeniero Civil en Informática</p>
                                <p className="mt-1 text-sm text-[var(--foreground-muted)] flex items-center justify-center md:justify-start gap-2">
                                    <span>Valdivia, </span>
                                    <ReactCountryFlag
                                        countryCode="CL"
                                        svg
                                        style={{
                                            width: '1.5em',
                                            height: '1.5em',
                                        }}
                                        title="Chile"
                                    />
                                </p>
                                <span className="mt-4 inline-block h-1 w-12 rounded bg-purple-600"></span>
                                <div className="mt-6 flex gap-4">
                                    <a
                                        className="text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                                        href="https://www.linkedin.com/in/daranedag/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="LinkedIn"
                                    >
                                        <UserGroupIcon className="h-5 w-5" />
                                    </a>
                                    <a
                                        className="text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                                        href="https://x.com/mr_diegui"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Twitter/X"
                                    >
                                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                                    </a>
                                    <a
                                        className="text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                                        href="https://github.com/daranedag/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="GitHub"
                                    >
                                        <CodeBracketIcon className="h-5 w-5" />
                                    </a>
                                    <a
                                        className="text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                                        href="https://instagram.com/mrdiegui/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Instagram"
                                    >
                                        <CameraIcon className="h-5 w-5" />
                                    </a>
                                    <a
                                        className="text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                                        href="mailto:daranedag@gmail.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Email"
                                    >
                                        <EnvelopeIcon className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>
                            <div className="col-span-1 space-y-8 md:col-span-2">
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">About Me</h2>
                                    <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
                                        I'm a product designer with over 5 years of experience in creating user-centered designs for web and mobile applications. My passion lies in solving complex problems and crafting intuitive, visually appealing interfaces that enhance user experience. I believe in a collaborative design process, working closely with cross-functional teams to bring innovative ideas to life.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Professional Journey</h2>
                                    <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
                                        My career began at a small startup where I honed my skills in UI/UX design, working on a variety of projects from concept to launch. I then moved to a larger tech company, where I specialized in interaction design and contributed to the development of a flagship product used by millions of users. Throughout my journey, I've embraced challenges, continuously learned, and adapted to the ever-evolving landscape of design.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Personal Interests</h2>
                                    <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
                                        Beyond design, I'm an avid traveler, always seeking new experiences and perspectives. I enjoy photography, capturing moments and stories through the lens. I also have a keen interest in sustainable living and exploring ways to integrate eco-friendly practices into my daily life. These interests fuel my creativity and inspire my design work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}

Bio.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Bio;
