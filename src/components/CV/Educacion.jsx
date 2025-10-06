import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const Educacion = () => {
    const { t } = useTranslation();

    return (
        <section>
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">school</span>
                {t("cv.educationTitle")}
            </h3>
            <div className="space-y-4">
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {t("cv.education.university.degree")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">{t("cv.education.university.institution")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">{t("cv.education.university.location")}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{t("cv.education.university.period")}</p>
                </div>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{t("cv.education.highschool.degree")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">{t("cv.education.highschool.institution")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">{t("cv.education.highschool.location")}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{t("cv.education.highschool.period")}</p>
                </div>
            </div>
        </section>
    );
}

export default Educacion;
