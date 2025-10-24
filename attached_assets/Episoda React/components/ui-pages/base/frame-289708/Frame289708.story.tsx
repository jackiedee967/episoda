import {Frame289708 as Component} from 'components/ui-pages/base/frame-289708';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Frame289708',
  component: Component,
};

export const SeasonsAndEpisodesDark: Story = {
  args: {
    prop: 'Seasons and Episodes',
    state: 'Dark',
  },
};

export const SeasonsAndEpisodesWhite: Story = {
  args: {
    ...SeasonsAndEpisodesDark.args,
    Prop: 'Seasons and Episodes',
    State: 'White',
  }
};

export default meta;
