import {ExplorePageUserCards as Component} from 'components/ui-pages/base/explore-page-user-cards';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/ExplorePageUserCards',
  component: Component,
};

export const NotFollowing: Story = {
  args: {
    state: 'NotFollowing',
  },
};

export const Following: Story = {
  args: {
    ...NotFollowing.args,
    State: 'Following',
  }
};

export default meta;
