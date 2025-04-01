import { Icon, Markdown } from '@lobehub/ui';
import { Button } from 'antd';
import { Download as DownloadIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { exportFile } from '@/utils/client/exportFile';

interface TextRendererProps {
  content: string;
  title?: string;
}

const TextRenderer = memo<TextRendererProps>(({ content, title = 'document.txt' }) => {
  const { t } = useTranslation('portal');

  const handleDownload = () => {
    exportFile(content, title);
  };

  return (
    <Flexbox gap={16} style={{ flexDirection: 'column', height: '100%' }} width={'100%'}>
      <Flexbox flex={1} style={{ overflow: 'auto' }} width={'100%'}>
        <Markdown style={{ padding: '16px' }}>{content}</Markdown>
      </Flexbox>
      <Flexbox align={'center'} padding={8}>
        <Button icon={<Icon icon={DownloadIcon} />} onClick={handleDownload}>
          {t('artifacts.text.download', 'Download Text File')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

export default TextRenderer;
