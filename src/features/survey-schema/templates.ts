import { createEmptySurvey } from './factories';
import type { ChoiceOption, SurveyBlock, SurveyDocument } from './schema';

export type SurveyTemplateKey = 'event-signup' | 'satisfaction' | 'lead-collection';

export const surveyTemplateCatalog: Array<{
  key: SurveyTemplateKey;
  title: string;
  description: string;
  actionLabel: string;
}> = [
  {
    key: 'event-signup',
    title: '活动报名模板',
    description: '适合活动邀约、线下沙龙、公开课报名。',
    actionLabel: '活动报名模板'
  },
  {
    key: 'satisfaction',
    title: '满意度回访模板',
    description: '适合服务回访、课程反馈、产品满意度收集。',
    actionLabel: '满意度回访模板'
  },
  {
    key: 'lead-collection',
    title: '线索收集模板',
    description: '适合销售线索登记、商机初筛与需求收集。',
    actionLabel: '线索收集模板'
  }
] as const;

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createOptions(values: string[]): ChoiceOption[] {
  return values.map((text) => ({
    id: createId('option'),
    text
  }));
}

function withBlocks(base: SurveyDocument, title: string, blocks: SurveyBlock[]): SurveyDocument {
  return {
    ...base,
    title,
    blocks
  };
}

export function createSurveyFromTemplate({
  id,
  template
}: {
  id: string;
  template?: string;
}): SurveyDocument {
  const base = createEmptySurvey({ id });

  switch (template) {
    case 'event-signup':
      return withBlocks(base, '活动报名表', [
        {
          id: createId('block'),
          type: 'title',
          label: '活动报名表',
          level: 1
        },
        {
          id: createId('block'),
          type: 'input',
          label: '姓名',
          placeholder: '请输入姓名'
        },
        {
          id: createId('block'),
          type: 'singleChoice',
          label: '参与场次',
          options: createOptions(['上午场', '下午场', '晚上场'])
        }
      ]);
    case 'satisfaction':
      return withBlocks(base, '满意度回访问卷', [
        {
          id: createId('block'),
          type: 'title',
          label: '满意度回访问卷',
          level: 1
        },
        {
          id: createId('block'),
          type: 'singleChoice',
          label: '整体满意度',
          options: createOptions(['非常满意', '比较满意', '一般'])
        },
        {
          id: createId('block'),
          type: 'multiChoice',
          label: '你最关注哪些方面',
          options: createOptions(['产品体验', '客服响应', '交付速度'])
        }
      ]);
    case 'lead-collection':
      return withBlocks(base, '线索收集表', [
        {
          id: createId('block'),
          type: 'title',
          label: '线索收集表',
          level: 1
        },
        {
          id: createId('block'),
          type: 'input',
          label: '联系人姓名',
          placeholder: '请输入联系人姓名'
        },
        {
          id: createId('block'),
          type: 'singleChoice',
          label: '需求类型',
          options: createOptions(['产品咨询', '方案演示', '商务合作'])
        }
      ]);
    default:
      return base;
  }
}
