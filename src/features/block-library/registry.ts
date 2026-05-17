import type { ReactElement } from 'react';
import type { SurveyBlock } from '@/features/survey-schema/schema';
import {
  InputBlockRenderer,
  MultiChoiceRenderer,
  ParagraphBlockRenderer,
  SingleChoiceRenderer,
  TitleBlockRenderer,
  type RendererMode
} from '@/features/renderer/renderers';

type BlockRendererComponent = (props: { block: SurveyBlock; mode: RendererMode }) => ReactElement;

export const blockRegistry: Record<SurveyBlock['type'], BlockRendererComponent> = {
  title: TitleBlockRenderer as BlockRendererComponent,
  paragraph: ParagraphBlockRenderer as BlockRendererComponent,
  input: InputBlockRenderer as BlockRendererComponent,
  singleChoice: SingleChoiceRenderer as BlockRendererComponent,
  multiChoice: MultiChoiceRenderer as BlockRendererComponent
};
