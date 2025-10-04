const ConnectSection = () => {
    return (
        <section className="mt-24" id="connect">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Conectemos
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                    Siempre estoy abierto a discutir nuevos proyectos o ideas creativas. No dudes en
                    contactarme.
                </p>
                <div className="mt-8 flex justify-center gap-6">
                    <a
                        className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                        href="#"
                        aria-label="LinkedIn"
                    >
                        <svg
                            aria-hidden="true"
                            className="h-7 w-7"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                clipRule="evenodd"
                                d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zm-11 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1zm-1 4a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H7z"
                                fillRule="evenodd"
                            ></path>
                        </svg>
                    </a>
                    <a
                        className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                        href="#"
                        aria-label="GitHub"
                    >
                        <svg
                            aria-hidden="true"
                            className="h-7 w-7"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12,2A10,10,0,0,0,2,12c0,4.42,2.87,8.17,6.84,9.5.5.09.68-.22.68-.48s0-.89,0-1.74c-2.78.6-3.37-1.34-3.37-1.34A2.66,2.66,0,0,0,4.9,16.3c-.91-.62.07-.6.07-.6a2.1,2.1,0,0,1,1.53,1.03,2.12,2.12,0,0,0,2.91.83,2.14,2.14,0,0,1,.63-1.34C9.2,16.27,6.4,15.2,6.4,10.61a4.23,4.23,0,0,1,1.11-2.92,3.93,3.93,0,0,1,.1-2.88s1.08-.35,3.53,1.3A12.28,12.28,0,0,1,12,6.09a12.3,12.3,0,0,1,3.33.45c2.45-1.65,3.53-1.3,3.53-1.3a3.93,3.93,0,0,1,.1,2.88,4.23,4.23,0,0,1,1.11,2.92c0,4.6-2.8,5.66-5.49,6a2.53,2.53,0,0,1,.68,1.92c0,1.39,0,2.51,0,2.85s.18.58.69.48A10,10,0,0,0,22,12,10,10,0,0,0,12,2Z"></path>
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ConnectSection;
