import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const Experiencia = () => {
    const { t } = useTranslation();
    return (
        <section>
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">work</span>
                Experience
            </h3>
            <div className="space-y-6 border-l-2 border-slate-200 dark:border-slate-800 pl-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-600">
                <div className="relative">
                    <div className="absolute -left-[33px] top-1.5 size-4 bg-primary rounded-full"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-1">{t('cv.experience.job1.period')}</p>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{t('cv.experience.job1.position')}</h4>
                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-2">{t('cv.experience.job1.company')}</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{t('cv.experience.job1.details.0')}</p>
                </div>
                <div className="relative">
                    <div className="absolute -left-[33px] top-1.5 size-4 bg-primary rounded-full"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-1">{t('cv.experience.job2.period')}</p>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{t('cv.experience.job2.position')}</h4>
                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-2">{t('cv.experience.job2.company')}</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{t('cv.experience.job2.details.0')}</p>
                </div>
                <div className="relative">
                    <div className="absolute -left-[33px] top-1.5 size-4 bg-primary rounded-full"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-1">{t('cv.experience.job3.period')}</p>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{t('cv.experience.job3.position')}</h4>
                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-2">{t('cv.experience.job3.company')}</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{t('cv.experience.job3.details.0')}</p>
                </div>
            </div>
        </section>
    );
}

export default Experiencia;
