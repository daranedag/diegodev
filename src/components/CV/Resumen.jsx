import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const Resumen = () => {
    const { t } = useTranslation();

    const ageExperience = useMemo(() => {
        const startDate = new Date(2015, 3, 14); // Mes 0 = Enero (0-indexed)
        const today = new Date();
        let calculatedExperience = today.getFullYear() - startDate.getFullYear();
        const monthDiff = today.getMonth() - startDate.getMonth();

        // Ajustar si aún no ha cumplido años este año
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
            calculatedExperience--;
        }

        return calculatedExperience;
    }, []);

    return (
        <section>
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">person</span>
                {t("cv.resumenTitle")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm text-justify">
                {t("cv.restumenText", { ageExperience })}
            </p>
        </section>
    );
};

export default Resumen;
