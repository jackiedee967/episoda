import {EyeLight as Component} from 'components/ui-pages/base/eye-light';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/EyeLight',
  component: Component,
};

export const EyeLight: Story = {
  // ...
};

export default meta;
