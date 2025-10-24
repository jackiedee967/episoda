import {Friends as Component} from 'components/ui-pages/base/friends';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Friends',
  component: Component,
};

export const FriendsWatchingBarLarge: Story = {
  args: {
    prop: 'Large',
    state: 'Friends Watching Bar',
  },
};

export const FriendsWatchingBarSmall: Story = {
  args: {
    ...FriendsWatchingBarLarge.args,
    State: 'Friends Watching Bar',
    Prop: 'Small',
  }
};

export const FriendsInCommonBarSmall: Story = {
  args: {
    ...FriendsWatchingBarLarge.args,
    State: 'Friends In Common Bar',
    Prop: 'Small',
  }
};

export default meta;
