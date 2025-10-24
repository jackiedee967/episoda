import {QuestionLight as Component} from 'components/ui-pages/base/question-light';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/QuestionLight',
  component: Component,
};

export const QuestionLight: Story = {
  // ...
};

export default meta;
