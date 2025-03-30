// the code below can only be modified with commercial license
// if you want to use it in the commercial usage
// please contact us for more information: hello@lobehub.com

export const LOBE_CHAT_CLOUD = 'LobeChat Cloud';

// Use environment variables if they exist, otherwise fall back to defaults
export const BRANDING_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'LobeChat';
export const BRANDING_DESCRIPTION = process.env.NEXT_PUBLIC_DESCRIPTION || '';
export const BRANDING_TITLE_SUFFIX = process.env.NEXT_PUBLIC_TITLE_SUFFIX || '';
export const BRANDING_CALL_TO_ACTION = process.env.NEXT_PUBLIC_CALL_TO_ACTION || '';
export const BRANDING_LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || '';

export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'LobeHub';

export const BRANDING_URL = {
  help: undefined,
  privacy: undefined,
  terms: undefined,
};
