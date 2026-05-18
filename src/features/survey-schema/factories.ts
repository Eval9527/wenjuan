import type {
  ChoiceOption,
  SurveyBlock,
  SurveyBlockType,
  SurveyDocument
} from './schema';

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createChoiceOptions(): ChoiceOption[] {
  return [
    { id: createId('option'), text: '选项 1' },
    { id: createId('option'), text: '选项 2' }
  ];
}

export function createEmptySurvey({ id }: { id: string }): SurveyDocument {
  const now = new Date().toISOString();

  return {
    id,
    title: '未命名问卷',
    blocks: [],
    settings: {
      submitLabel: '提交'
    },
    meta: {
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  };
}

export function createBlock(type: SurveyBlockType): SurveyBlock {
  switch (type) {
    case 'title':
      return {
        id: createId('block'),
        type: 'title',
        label: '新标题',
        level: 1,
        align: 'center'
      };
    case 'paragraph':
      return {
        id: createId('block'),
        type: 'paragraph',
        content: '这是一段说明文字',
        align: 'left'
      };
    case 'input':
      return {
        id: createId('block'),
        type: 'input',
        label: '填写题',
        placeholder: '请输入'
      };
    case 'singleChoice':
      return {
        id: createId('block'),
        type: 'singleChoice',
        label: '单选题',
        options: createChoiceOptions()
      };
    case 'multiChoice':
      return {
        id: createId('block'),
        type: 'multiChoice',
        label: '多选题',
        options: createChoiceOptions()
      };
    default:
      throw new Error(`Unsupported block type: ${type satisfies never}`);
  }
}
