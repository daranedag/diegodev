const Project = ({ title, description, link, imageUrl }) => {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="group relative overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <a className="block" href={link}>
                    <div className="aspect-[9/3] w-full overflow-hidden">
                        <div className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url("${imageUrl}")` }}></div>
                    </div>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">{title}</h3>
                        <p className="mt-2 text-sm text-text-light/70 dark:text-text-dark/70">{description}</p>
                    </div>
                </a>
            </div>
        </div>
    )
}

export default Project;