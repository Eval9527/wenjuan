import { createBlock } from '@/features/survey-schema/factories';
import type { SurveyBlock, SurveyDocument } from '@/features/survey-schema/schema';

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function withNextMeta(currentDocument: SurveyDocument, blocks: SurveyBlock[], title = currentDocument.title): SurveyDocument {
  return {
    ...currentDocument,
    title,
    blocks,
    meta: {
      ...currentDocument.meta,
      version: currentDocument.meta.version + 1,
      updatedAt: new Date().toISOString()
    }
  };
}

function extractRenamedTitle(prompt: string) {
  const match = prompt.match(/(?:把标题改成|标题改成|标题改为)(.+)$/);
  return match?.[1]?.trim();
}

function buildGeneratedSurvey(prompt: string, currentDocument: SurveyDocument) {
  const title = prompt.includes('满意') ? '满意度调查' : 'AI 生成问卷';
  const nextDocument = withNextMeta(
    currentDocument,
    [
      {
        id: createId('block'),
        type: 'title',
        label: title,
        level: 1,
        align: 'center'
      },
      {
        id: createId('block'),
        type: 'singleChoice',
        label: '你对产品满意吗？',
        options: [
          { id: createId('option'), text: '满意' },
          { id: createId('option'), text: '一般' }
        ]
      }
    ],
    title
  );

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: `新增 ${nextDocument.blocks.length} 个题目`,
    operations: nextDocument.blocks.map((block) => ({
      type: 'addBlock' as const,
      block
    })),
    nextDocument
  };
}

function buildTitleUpdate(prompt: string, currentDocument: SurveyDocument) {
  const title = extractRenamedTitle(prompt) ?? 'AI 新标题';
  const titleBlock = currentDocument.blocks.find((block) => block.type === 'title');

  if (!titleBlock) {
    const block = {
      ...createBlock('title'),
      label: title
    };

    return {
      id: createId('change'),
      basedOnVersion: currentDocument.meta.version,
      userIntent: prompt,
      summary: '新增 1 个标题',
      operations: [
        {
          type: 'addBlock' as const,
          block
        }
      ],
      nextDocument: withNextMeta(currentDocument, [block, ...currentDocument.blocks], title)
    };
  }

  const nextDocument = withNextMeta(
    currentDocument,
    currentDocument.blocks.map((block) =>
      block.id === titleBlock.id
        ? {
            ...block,
            label: title
          }
        : block
    ),
    title
  );

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: '修改 1 个标题',
    operations: [
      {
        type: 'updateBlock' as const,
        blockId: titleBlock.id,
        changes: {
          label: title
        }
      }
    ],
    nextDocument
  };
}

function buildInputAddition(prompt: string, currentDocument: SurveyDocument) {
  const label = prompt.includes('手机号') ? '手机号' : prompt.includes('联系方式') ? '联系方式' : '填写题';
  const block = {
    ...createBlock('input'),
    label,
    placeholder: `请输入${label}`
  };
  const nextDocument = withNextMeta(currentDocument, [...currentDocument.blocks, block]);

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: `新增 1 个${label}填写题`,
    operations: [
      {
        type: 'addBlock' as const,
        block
      }
    ],
    nextDocument
  };
}

function buildChoiceAddition(prompt: string, currentDocument: SurveyDocument, type: 'singleChoice' | 'multiChoice') {
  const block = createBlock(type);
  const nextDocument = withNextMeta(currentDocument, [...currentDocument.blocks, block]);

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: `新增 1 个${type === 'singleChoice' ? '单选' : '多选'}题`,
    operations: [
      {
        type: 'addBlock' as const,
        block
      }
    ],
    nextDocument
  };
}

function buildRemoveLastBlock(prompt: string, currentDocument: SurveyDocument) {
  const targetBlock = [...currentDocument.blocks].reverse().find(Boolean);

  if (!targetBlock) {
    return buildGeneratedSurvey(prompt, currentDocument);
  }

  const nextDocument = withNextMeta(
    currentDocument,
    currentDocument.blocks.filter((block) => block.id !== targetBlock.id)
  );

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: '删除 1 个题目',
    operations: [
      {
        type: 'removeBlock' as const,
        blockId: targetBlock.id
      }
    ],
    nextDocument
  };
}

export function buildMockChangeSet(prompt: string, currentDocument: SurveyDocument) {
  if (/(把标题改成|标题改成|标题改为)/.test(prompt)) {
    return buildTitleUpdate(prompt, currentDocument);
  }

  if (/(手机号|联系方式)/.test(prompt) && /(填写框|输入|题|字段)/.test(prompt)) {
    return buildInputAddition(prompt, currentDocument);
  }

  if (/删除最后/.test(prompt)) {
    return buildRemoveLastBlock(prompt, currentDocument);
  }

  if (/多选/.test(prompt)) {
    return buildChoiceAddition(prompt, currentDocument, 'multiChoice');
  }

  if (/单选/.test(prompt)) {
    return buildChoiceAddition(prompt, currentDocument, 'singleChoice');
  }

  return buildGeneratedSurvey(prompt, currentDocument);
}
