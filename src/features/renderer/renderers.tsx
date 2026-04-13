import type {
  InputBlock,
  MultiChoiceBlock,
  SingleChoiceBlock,
  SurveyBlock,
  TitleBlock
} from '@/features/survey-schema/schema';

export type RendererMode = 'editor-preview' | 'published-desktop' | 'published-mobile';

type BlockRendererProps<T extends SurveyBlock> = {
  block: T;
  mode: RendererMode;
};

function frameClass(mode: RendererMode) {
  return mode === 'editor-preview' ? 'editor-preview' : 'published-preview';
}

export function TitleBlockRenderer({ block, mode }: BlockRendererProps<TitleBlock>) {
  const Tag = block.level === 1 ? 'h2' : 'h3';
  return (
    <section className={frameClass(mode)}>
      <Tag>{block.label}</Tag>
      {block.description ? <p>{block.description}</p> : null}
    </section>
  );
}

export function InputBlockRenderer({ block, mode }: BlockRendererProps<InputBlock>) {
  return (
    <section className={frameClass(mode)}>
      <label>
        <span>{block.label}</span>
        <input aria-label={block.label} placeholder={block.placeholder} />
      </label>
      {block.description ? <p>{block.description}</p> : null}
    </section>
  );
}

function ChoiceField({ block, mode, type }: { block: SingleChoiceBlock | MultiChoiceBlock; mode: RendererMode; type: 'radio' | 'checkbox' }) {
  return (
    <fieldset className={frameClass(mode)}>
      <legend>{block.label}</legend>
      {block.description ? <p>{block.description}</p> : null}
      {block.options.map((option) => (
        <label key={option.id}>
          <input name={block.id} type={type} aria-label={option.text} />
          <span>{option.text}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function SingleChoiceRenderer({ block, mode }: BlockRendererProps<SingleChoiceBlock>) {
  return <ChoiceField block={block} mode={mode} type="radio" />;
}

export function MultiChoiceRenderer({ block, mode }: BlockRendererProps<MultiChoiceBlock>) {
  return <ChoiceField block={block} mode={mode} type="checkbox" />;
}
