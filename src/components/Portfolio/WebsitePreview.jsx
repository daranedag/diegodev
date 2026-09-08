import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const WebsitePreview = ({ url, title, variant = 'card' }) => {
    const isDetail = variant === 'detail';
    const [hasError, setHasError] = useState(false);
    const screenshotUrl = useMemo(
        () => `https://v1.screenshot.11ty.dev/${encodeURIComponent(url)}/opengraph/`,
        [url]
    );

    return (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-500">
            <div
                className="absolute inset-0 flex items-center justify-center px-6"
                aria-hidden="true"
            >
                <span className="text-center text-xl font-semibold tracking-wide text-white drop-shadow-sm">
                    {title}
                </span>
            </div>
            {!hasError && (
                <img
                    src={screenshotUrl}
                    alt={title}
                    loading={isDetail ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onError={() => setHasError(true)}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                />
            )}
        </div>
    );
};

WebsitePreview.propTypes = {
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(['card', 'detail', 'featured']),
};

export default WebsitePreview;
