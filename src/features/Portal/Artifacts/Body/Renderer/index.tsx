import { Markdown, Mermaid } from '@lobehub/ui';
import dynamic from 'next/dynamic';
import { memo } from 'react';

import HTMLRenderer from './HTML';
import ImageRenderer from './Image';
import PDFRenderer from './PDF';
import SVGRender from './SVG';
import TextRenderer from './Text';

const ReactRenderer = dynamic(() => import('./React'), { ssr: false });

const Renderer = memo<{ content: string; title?: string, type?: string; }>(
  ({ content, type, title }) => {
    switch (type) {
      case 'application/lobe.artifacts.react': {
        return <ReactRenderer code={content} />;
      }

      case 'image/svg+xml': {
        return <SVGRender content={content} />;
      }

      case 'image/png':
      case 'image/jpeg':
      case 'image/gif': {
        return <ImageRenderer content={content} title={title} />;
      }

      case 'text/plain': {
        return <TextRenderer content={content} title={title} />;
      }

      case 'application/pdf': {
        return <PDFRenderer content={content} title={title} />;
      }

      case 'application/lobe.artifacts.mermaid': {
        return <Mermaid type={'pure'}>{content}</Mermaid>;
      }

      case 'text/markdown': {
        return <Markdown style={{ overflow: 'auto' }}>{content}</Markdown>;
      }

      default: {
        if (type?.startsWith('image/')) {
          return <ImageRenderer content={content} title={title} />;
        }
        return <HTMLRenderer htmlContent={content} />;
      }
    }
  },
);

export default Renderer;
