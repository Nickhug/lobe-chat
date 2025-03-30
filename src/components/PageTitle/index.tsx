import { memo, useEffect } from 'react';

import { BRANDING_NAME, BRANDING_TITLE_SUFFIX } from '@/const/branding';

const PageTitle = memo<{ title: string }>(({ title }) => {
  useEffect(() => {
    const titleSuffix = BRANDING_TITLE_SUFFIX || ` · ${BRANDING_NAME}`;
    document.title = title ? `${title}${titleSuffix}` : BRANDING_NAME;
  }, [title]);

  return null;
});

export default PageTitle;
