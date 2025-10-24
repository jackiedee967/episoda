import {LogAShow as Component} from 'components/ui-pages/base/log-a-show';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/LogAShow',
  component: Component,
};

export const LogAShow: Story = {
  // ...
};

export default meta;
