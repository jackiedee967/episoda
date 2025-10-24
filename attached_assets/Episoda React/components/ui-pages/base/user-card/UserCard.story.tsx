import {UserCard as Component} from 'components/ui-pages/base/user-card';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/UserCard',
  component: Component,
};

export const UserCard: Story = {
  // ...
};

export default meta;
