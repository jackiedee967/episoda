import {StarRatings as Component} from 'components/ui-pages/base/star-ratings';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/StarRatings',
  component: Component,
};

export const Blank: Story = {
  args: {
    state: 'blank',
  },
};

export const $1: Story = {
  args: {
    ...Blank.args,
    State: '1',
  }
};

export const $2: Story = {
  args: {
    ...Blank.args,
    State: '2',
  }
};

export const $3: Story = {
  args: {
    ...Blank.args,
    State: '3',
  }
};

export const $4: Story = {
  args: {
    ...Blank.args,
    State: '4',
  }
};

export const $5: Story = {
  args: {
    ...Blank.args,
    State: '5',
  }
};

export default meta;
