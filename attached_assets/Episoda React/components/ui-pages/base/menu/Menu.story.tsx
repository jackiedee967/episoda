import {Menu as Component} from 'components/ui-pages/base/menu';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Menu',
  component: Component,
};

export const Menu: Story = {
  // ...
};

export default meta;
