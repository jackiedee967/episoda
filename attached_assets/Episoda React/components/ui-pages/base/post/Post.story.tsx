import {Post as Component} from 'components/ui-pages/base/post';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Post',
  component: Component,
};

export const Post: Story = {
  // ...
};

export default meta;
