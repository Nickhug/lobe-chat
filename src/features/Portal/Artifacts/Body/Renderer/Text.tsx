import { Markdown } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ExportOptions from '@/components/ExportOptions';

interface TextRendererProps {
  content: string;
  title?: string;
}

const TextRenderer = memo<TextRendererProps>(({ content, title = 'document.txt' }) => {
  return (
    <Flexbox gap={16} style={{ flexDirection: 'column', height: '100%' }} width={'100%'}>
      <Flexbox flex={1} style={{ overflow: 'auto' }} width={'100%'}>
        <Markdown style={{ padding: '16px' }}>{content}</Markdown>
      </Flexbox>
      <Flexbox align={'center'} padding={8}>
        <ExportOptions content={content} title={title} type="text" />
      </Flexbox>
    </Flexbox>
  );
});

export default TextRenderer;
