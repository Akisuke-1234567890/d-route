export const APP_VERSION = '2.0.5-p01';
export const BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? 'local';
export const VERSION_LABEL = `v${APP_VERSION}${BUILD_ID === 'local' ? '' : ` · ${BUILD_ID}`}`;
