import pkg from '@/../package.json';

import { BRANDING_NAME, ORG_NAME } from './branding';

export const CURRENT_VERSION = pkg.version;

export const isServerMode = process.env.NEXT_PUBLIC_SERVICE_MODE === 'server';
export const isUsePgliteDB = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';

export const isDeprecatedEdition = !isServerMode && !isUsePgliteDB;

// Always use custom branding
export const isCustomBranding = true;
// Always use custom org
export const isCustomORG = true;
