const Hero = () => {
    return (
        <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Diego - DieGui DeV
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-400">
                Un programador curioso y multifacético que le gusta compartir de lo aprendido.
            </p>
            <div className="mt-8 flex justify-center gap-4">
                <a
                    className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    href="./pages/links.html"
                >
                    Conectar
                </a>
                <a
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                    href="./pages/portafolio.html"
                >
                    Ver Portafolio
                </a>
            </div>
        </div>
    );
};

export default Hero;
