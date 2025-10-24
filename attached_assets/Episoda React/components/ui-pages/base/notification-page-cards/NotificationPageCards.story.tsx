import {NotificationPageCards as Component} from 'components/ui-pages/base/notification-page-cards';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/NotificationPageCards',
  component: Component,
};

export const LikeDefault: Story = {
  args: {
    state: 'Default',
    type: 'Like',
  },
};

export const RepostDefault: Story = {
  args: {
    ...LikeDefault.args,
    Type: 'Repost',
    State: 'Default',
  }
};

export const FollowDefault: Story = {
  args: {
    ...LikeDefault.args,
    Type: 'Follow',
    State: 'Default',
  }
};

export const CommentDefault: Story = {
  args: {
    ...LikeDefault.args,
    Type: 'Comment',
    State: 'Default',
  }
};

export default meta;
