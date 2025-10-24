import {ColorPicker as Component} from 'components/ui-pages/base/color-picker';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/ColorPicker',
  component: Component,
};

export const ColorPicker: Story = {
  // ...
};

export default meta;
