import React, { useRef } from 'react';
import Educacion from '../components/CV/Educacion';
import Skills from '../components/CV/Skills';
import Experiencia from '../components/CV/Experiencia';
import Logros from '../components/CV/Logros';
import Resumen from '../components/CV/Resumen';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import html2pdf from 'html2pdf.js';

const CV = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();
    const cvRef = useRef(null);

    const handleDownloadPDF = () => {
        const element = cvRef.current;

        // Buscar el div con scroll de la sección de Experiencia
        const scrollContainer = element.querySelector('.overflow-y-auto');

        // Buscar el encabezado del PDF
        const pdfHeader = element.querySelector('#pdf-header');

        // Guardar estilos originales
        let originalMaxHeight = null;
        let originalOverflow = null;
        let originalHeaderDisplay = null;

        if (scrollContainer) {
            originalMaxHeight = scrollContainer.style.maxHeight;
            originalOverflow = scrollContainer.style.overflow;

            // Remover temporalmente el scroll y altura máxima
            scrollContainer.style.maxHeight = 'none';
            scrollContainer.style.overflow = 'visible';
        }

        if (pdfHeader) {
            originalHeaderDisplay = pdfHeader.style.display;
            // Mostrar el encabezado solo para el PDF
            pdfHeader.style.display = 'block';
        }

        const opt = {
            margin: [10, 10, 10, 10],
            filename: 'CV_Diego_Araneda.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break-before',
                after: '.page-break-after',
                avoid: '.avoid-page-break'
            }
        };

        // Generar PDF y restaurar estilos después
        html2pdf().set(opt).from(element).save().then(() => {
            if (scrollContainer) {
                scrollContainer.style.maxHeight = originalMaxHeight;
                scrollContainer.style.overflow = originalOverflow;
            }
            if (pdfHeader) {
                pdfHeader.style.display = originalHeaderDisplay;
            }
        });
    };

    return (
        <>
            <style>
                {`
                    .avoid-page-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .page-break-before {
                        page-break-before: always;
                        break-before: always;
                    }
                    .page-break-after {
                        page-break-after: always;
                        break-after: always;
                    }
                `}
            </style>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('cv.title')}</h2>
                            <button
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:focus:ring-offset-background-dark transition-all"
                            >
                                <span className="material-symbols-outlined text-base">download</span>
                                PDF
                            </button>
                        </div>
                        <div ref={cvRef}>
                            {/* Encabezado solo visible en PDF */}
                            <div className="hidden mb-8 pb-6 border-b-2 border-slate-300 dark:border-slate-700" id="pdf-header">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Diego Araneda Geldres</h1>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">phone</span>
                                        <span>+56 9 6760 3803</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">mail</span>
                                        <span>daranedag@gmail.com</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">language</span>
                                        <span>diegui.dev</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">location_on</span>
                                        <span>Valdivia, Chile</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                <div className="md:col-span-1 space-y-10">
                                    <div className="avoid-page-break">
                                        <Resumen />
                                    </div>
                                    <div className="avoid-page-break">
                                        <Educacion />
                                    </div>
                                    <div className="avoid-page-break page-break-before">
                                        <Skills />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-10">
                                    <div className="avoid-page-break">
                                        <Experiencia />
                                    </div>
                                    <div className="avoid-page-break">
                                        <Logros />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default CV;
