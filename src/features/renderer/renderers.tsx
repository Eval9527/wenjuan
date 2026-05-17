import type {
  InputBlock,
  MultiChoiceBlock,
  ParagraphBlock,
  SingleChoiceBlock,
  SurveyBlock,
  TitleBlock
} from '@/features/survey-schema/schema';

export type RendererMode = 'editor-preview' | 'published-desktop' | 'published-mobile';

type BlockRendererProps<T extends SurveyBlock> = {
  block: T;
  mode: RendererMode;
};

function blockClass(type: 'title' | 'paragraph' | 'question', _mode: RendererMode) {
  if (type === 'title') {
    return 'survey-block survey-block--title';
  }

  if (type === 'paragraph') {
    return 'survey-block survey-block--paragraph';
  }

  return 'survey-block';
}

function QuestionHeader({
  label,
  description,
  required
}: {
  label: string;
  description?: string;
  required?: boolean;
}) {
  return (
    <div className="survey-question-head">
      <div className="survey-question-title">
        <span>{label}</span>
        {required ? <span className="survey-required-mark">*</span> : null}
      </div>
      {description ? <p className="survey-question-desc">{description}</p> : null}
    </div>
  );
}

export function TitleBlockRenderer({ block, mode }: BlockRendererProps<TitleBlock>) {
  const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3';

  return (
    <section className={blockClass('title', mode)} data-mode={mode} style={{ textAlign: block.align ?? 'left' }}>
      <Tag className="survey-title-heading" data-level={String(block.level)} data-align={block.align ?? 'left'}>
        {block.label}
      </Tag>
    </section>
  );
}

function ParagraphText({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      {(paragraphs.length ? paragraphs : ['']).map((paragraph, paragraphIndex) => {
        const lines = paragraph.split(/\n/);

        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 16)}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${lineIndex}-${line.slice(0, 12)}`}>
                {lineIndex > 0 ? <br /> : null}
                <span>{line}</span>
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

export function ParagraphBlockRenderer({ block, mode }: BlockRendererProps<ParagraphBlock>) {
  return (
    <section
      className={blockClass('paragraph', mode)}
      data-mode={mode}
      style={{ textAlign: block.align ?? 'left' }}
    >
      <div className="survey-paragraph-content" data-align={block.align ?? 'left'}>
        <ParagraphText content={block.content} />
      </div>
    </section>
  );
}

export function InputBlockRenderer({ block, mode }: BlockRendererProps<InputBlock>) {
  const isEditor = mode === 'editor-preview';
  return (
    <section className={blockClass('question', mode)} data-mode={mode}>
      <QuestionHeader description={block.description} label={block.label} required={block.required} />
      <input
        aria-label={block.label}
        className="survey-input-control"
        name={block.id}
        placeholder={block.placeholder}
        required={Boolean(block.required)}
        readOnly={isEditor}
        tabIndex={isEditor ? -1 : 0}
        onClick={(e) => isEditor && e.preventDefault()}
      />
    </section>
  );
}

function ChoiceField({
  block,
  mode,
  type
}: {
  block: SingleChoiceBlock | MultiChoiceBlock;
  mode: RendererMode;
  type: 'radio' | 'checkbox';
}) {
  const isEditor = mode === 'editor-preview';
  return (
    <fieldset className={blockClass('question', mode) + ' survey-choice-group'} data-mode={mode}>
      <legend>
        <QuestionHeader description={block.description} label={block.label} required={block.required} />
      </legend>
      <div className="survey-choice-list">
        {block.options.map((option) => (
          <label
            className="survey-choice-item"
            key={option.id}
            onClick={(event) => {
              if (isEditor) {
                event.preventDefault();
              }
            }}
          >
            <input
              aria-label={option.text}
              disabled={isEditor}
              name={block.id}
              required={type === 'radio' ? Boolean(block.required) : false}
              tabIndex={isEditor ? -1 : 0}
              type={type}
              value={option.text}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SingleChoiceRenderer({ block, mode }: BlockRendererProps<SingleChoiceBlock>) {
  return <ChoiceField block={block} mode={mode} type="radio" />;
}

export function MultiChoiceRenderer({ block, mode }: BlockRendererProps<MultiChoiceBlock>) {
  return <ChoiceField block={block} mode={mode} type="checkbox" />;
}
