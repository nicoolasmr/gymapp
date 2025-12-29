import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Simple Component to test infrastructure
const HelloWorld = () => {
    return (
        <View>
            <Text>Hello World</Text>
        </View>
    );
};

describe('<HelloWorld />', () => {
    it('renders correctly', () => {
        const { getByText } = render(<HelloWorld />);
        expect(getByText('Hello World')).toBeTruthy();
    });
});
