// GitHub Pages SPA fix: restore the original same-origin URL saved by 404.html.
(() => {
    const redirect = sessionStorage.getItem('spa_redirect');
    if (!redirect) return;
    sessionStorage.removeItem('spa_redirect');
    const url = new URL(redirect, window.location.origin);
    if (url.origin === window.location.origin && url.pathname !== '/') {
        history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
})();
