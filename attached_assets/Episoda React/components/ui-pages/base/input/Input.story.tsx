import {Input as Component} from 'components/ui-pages/base/input';
import type {StoryObj, Meta} from '@storybook/react';

type Story = StoryObj<typeof Component>;

const meta: Meta<typeof Component> = {
  title: 'UI Pages/Input',
  component: Component,
};

export const InputSearch: Story = {
  args: {
    areaCode: '+1',
    filledText: '305 1234 5678',
    helperDisabledText: 'Your phone number cannot be modified.',
    helperErrorText: 'Phone number already in use, try logging in.',
    helperSuccessText: 'Looking good!',
    helperText: 'We will use this number to validate your account.',
    placeholderInput: '305 1234 5678',
    text: 'Phone Number',
    typedText: '305 123',
    property1: 'Input',
    state: 'Search',
    helperText: true,
    iconStatus: true,
  },
};

export const InputStandard: Story = {
  args: {
    ...InputSearch.args,
    Property 1: 'Input',
    State: 'Standard',
  }
};

export const InputBodyText: Story = {
  args: {
    ...InputSearch.args,
    Property 1: 'Input',
    State: 'Body Text',
  }
};

export const InputPhone: Story = {
  args: {
    ...InputSearch.args,
    Property 1: 'Input',
    State: 'Phone',
  }
};

export default meta;
