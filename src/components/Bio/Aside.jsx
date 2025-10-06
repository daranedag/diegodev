import FotoProfile from '../../../assets/img/perfilNuevo.png';
import ReactCountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';
import { UserGroupIcon, ChatBubbleLeftRightIcon, CodeBracketIcon, CameraIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
const Aside = () => {
    const { t } = useTranslation();

    return (
        <aside>
            <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 h-40 w-40 flex-shrink-0">
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-full w-full" style={{ backgroundImage: `url(${FotoProfile})` }}></div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">Diego Araneda</h1>
                <p className="mt-2 text-lg text-[var(--foreground-muted)]">{t('bio.degree')}</p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)] flex items-center justify-center gap-2">
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
                <div className="mt-6 flex gap-4 justify-center">
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
        </aside>
    );
}
export default Aside;