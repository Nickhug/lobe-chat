import { Icon } from '@lobehub/ui';
import { Button, Typography } from 'antd';
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
      <Flexbox flex={1} style={{ overflow: 'auto', padding: '16px' }} width={'100%'}>
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography.Paragraph>
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
