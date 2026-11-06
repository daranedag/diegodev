import PropTypes from 'prop-types';

const ProjectBadge = ({ label }) => (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
        <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
        </svg>
        {label}
    </span>
);

ProjectBadge.propTypes = {
    label: PropTypes.string.isRequired,
};

export default ProjectBadge;
