import { useTranslation } from 'react-i18next';
const MainData = ({ age, ageExperience }) => {
    const { t } = useTranslation();

    return (
        <div className="col-span-1 space-y-8 md:col-span-2">
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{t('bio.aboutTitle')}</h2>
                <p className="text-lg text-[var(--foreground-muted)] leading-relaxed text-justify">
                    {t('bio.about', { age, ageExperience })}
                </p>
            </div>
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{t('bio.journeyTitle')}</h2>
                <p className="text-lg text-[var(--foreground-muted)] leading-relaxed text-justify">
                    {t('bio.journey', { ageExperience })}
                </p>
            </div>
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{t('bio.interestsTitle')}</h2>
                <p className="text-lg text-[var(--foreground-muted)] leading-relaxed text-justify">
                    {t('bio.interests')}
                </p>
            </div>
        </div>
    );
}
export default MainData;