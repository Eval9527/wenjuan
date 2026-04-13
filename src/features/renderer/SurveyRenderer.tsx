import { blockRegistry } from '@/features/block-library/registry';
import type { SurveyDocument } from '@/features/survey-schema/schema';
import type { RendererMode } from './renderers';

export function SurveyRenderer({
  document,
  mode
}: {
  document: SurveyDocument;
  mode: RendererMode;
}) {
  return (
    <div data-mode={mode}>
      {document.blocks.map((block) => {
        const Renderer = blockRegistry[block.type];
        return <Renderer key={block.id} block={block} mode={mode} />;
      })}
    </div>
  );
}
