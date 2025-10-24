import {PlaylistCard as Component} from 'components/ui-pages/base/playlist-card';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/PlaylistCard',
  component: Component,
};

export const PlaylistCard: Story = {
  // ...
};

export default meta;
