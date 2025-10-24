import {Homepage as Component} from 'components/ui-pages/base/homepage';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Homepage',
  component: Component,
};

export const Homepage: Story = {
  // ...
};

export default meta;
