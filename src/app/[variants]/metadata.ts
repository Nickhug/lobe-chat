import { appEnv } from '@/config/app';
import {
  BRANDING_DESCRIPTION,
  BRANDING_LOGO_URL,
  BRANDING_HEADER_LOGO_URL,
  BRANDING_NAME,
  BRANDING_TITLE_SUFFIX,
  ORG_NAME,
} from '@/const/branding';
import { DEFAULT_LANG } from '@/const/locale';
import { OFFICIAL_URL, OG_URL } from '@/const/url';
import { isCustomBranding, isCustomORG } from '@/const/version';
import { translation } from '@/server/translation';
import { DynamicLayoutProps } from '@/types/next';
import { RouteVariants } from '@/utils/server/routeVariants';

const BASE_PATH = appEnv.NEXT_PUBLIC_BASE_PATH;

// if there is a base path, then we don't need the manifest
const noManifest = !!BASE_PATH;

export const generateMetadata = async (props: DynamicLayoutProps) => {
  const locale = await RouteVariants.getLocale(props);
  const { t } = await translation('metadata', locale);

  // Use custom description if available, otherwise use translation
  const customDescription =
    BRANDING_DESCRIPTION || t('chat.description', { appName: BRANDING_NAME });
  // Use custom title suffix if available, otherwise default format
  const titleTemplate = BRANDING_TITLE_SUFFIX || `%s · ${BRANDING_NAME}`;

  return {
    alternates: {
      canonical: OFFICIAL_URL,
    },
    appleWebApp: {
      statusBarStyle: 'black-translucent',
      title: BRANDING_NAME,
    },
    description: customDescription,
    icons: {
      apple: '/apple-touch-icon.png',
      icon: '/favicon.ico',
      shortcut: '/favicon-32x32.ico',
    },
    manifest: noManifest ? undefined : '/manifest.json',
    metadataBase: new URL(OFFICIAL_URL),
    openGraph: {
      description: customDescription,
      images: [
        {
          alt: t('chat.title', { appName: BRANDING_NAME }),
          height: 640,
          url: OG_URL,
          width: 1200,
        },
      ],
      locale: DEFAULT_LANG,
      siteName: BRANDING_NAME,
      title: BRANDING_NAME,
      type: 'website',
      url: OFFICIAL_URL,
    },
    title: {
      default: t('chat.title', { appName: BRANDING_NAME }),
      template: titleTemplate,
    },
    twitter: {
      card: 'summary_large_image',
      description: customDescription,
      images: [OG_URL],
      site: isCustomORG ? `@${ORG_NAME}` : '@lobehub',
      title: t('chat.title', { appName: BRANDING_NAME }),
    },
  };
};
