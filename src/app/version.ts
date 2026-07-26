export const APP_VERSION = '2.0.0-alpha.10';
export const BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? 'local';
export const VERSION_LABEL = `v${APP_VERSION}${BUILD_ID === 'local' ? '' : ` · ${BUILD_ID}`}`;
