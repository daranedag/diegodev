import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const Logros = () => {
    const { t } = useTranslation();
    return (
        <section>
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">military_tech</span>
                {t('cv.achievementsTitle')}
            </h3>
            <ul className="space-y-3 list-disc list-inside text-slate-600 dark:text-slate-400 text-sm pl-2">
                <li>{t('cv.achievements.achievement1')}</li>
                <li>{t('cv.achievements.achievement2')}</li>
            </ul>
        </section>
    );
}

export default Logros;
