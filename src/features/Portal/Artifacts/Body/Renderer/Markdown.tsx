import { Markdown as MarkdownComponent } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ExportOptions from '@/components/ExportOptions';

interface MarkdownRendererProps {
  content: string;
  title?: string;
}

const MarkdownRenderer = memo<MarkdownRendererProps>(({ content, title = 'document.md' }) => {
  return (
    <Flexbox gap={16} style={{ flexDirection: 'column', height: '100%' }} width={'100%'}>
      <Flexbox flex={1} style={{ overflow: 'auto' }} width={'100%'}>
        <MarkdownComponent style={{ padding: '16px' }}>{content}</MarkdownComponent>
      </Flexbox>
      <Flexbox align={'center'} padding={8}>
        <ExportOptions content={content} title={title} type="markdown" />
      </Flexbox>
    </Flexbox>
  );
});

export default MarkdownRenderer;
