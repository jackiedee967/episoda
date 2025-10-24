import {FireLight as Component} from 'components/ui-pages/base/fire-light';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/FireLight',
  component: Component,
};

export const FireLight: Story = {
  // ...
};

export default meta;
