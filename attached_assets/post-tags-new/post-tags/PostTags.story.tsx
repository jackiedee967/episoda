import {PostTags as Component} from 'components/ui-pages/base/post-tags';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/PostTags',
  component: Component,
};

export const PostTagSESmall: Story = {
  args: {
    prop: 'Large',
    property1: 'Post Tag',
    state: 'S#E#',
  },
};

export const PostTagSELarge: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'S#E#',
    Prop: 'Large',
  }
};

export const PostTagShowNameLarge: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Show Name',
    Prop: 'Large',
  }
};

export const PostTagFanTheorySmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Fan Theory',
    Prop: 'Small',
  }
};

export const PostTagDiscussionSmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Discussion',
    Prop: 'Small',
  }
};

export const PostTagEpisodeRecapSmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Episode Recap',
    Prop: 'Small',
  }
};

export const PostTagSpoilerSmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Spoiler',
    Prop: 'Small',
  }
};

export const PostTagMiscSmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Misc',
    Prop: 'Small',
  }
};

export const PostTagCustomSmall: Story = {
  args: {
    ...PostTagSESmall.args,
    Property 1: 'Post Tag',
    State: 'Custom',
    Prop: 'Small',
  }
};

export default meta;
