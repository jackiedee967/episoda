import {Toggle as Component} from 'components/ui-pages/base/toggle';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Toggle',
  component: Component,
};

export const PostTag3Tabs: Story = {
  args: {
    property1: 'Post Tag',
    state: '3 tabs',
  },
};

export const PostTag3Tabs2: Story = {
  args: {
    ...PostTag3Tabs.args,
    Property 1: 'Post Tag',
    State: '3 tabs 2',
  }
};

export const PostTag2Tabs: Story = {
  args: {
    ...PostTag3Tabs.args,
    Property 1: 'Post Tag',
    State: '2 tabs',
  }
};

export const PostTag4Tabs: Story = {
  args: {
    ...PostTag3Tabs.args,
    Property 1: 'Post Tag',
    State: '4 tabs',
  }
};

export const PostTag2Tabs2: Story = {
  args: {
    ...PostTag3Tabs.args,
    Property 1: 'Post Tag',
    State: '2 tabs 2',
  }
};

export default meta;
