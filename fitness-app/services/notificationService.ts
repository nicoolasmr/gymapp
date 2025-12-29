import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

let registerForPushNotificationsAsync: (userId: string) => Promise<string | undefined>;
let savePushToken: (userId: string, token: string) => Promise<void>;

// Web-safe notification service
if (Platform.OS === 'web') {
    // Mock implementation for web
    registerForPushNotificationsAsync = async (userId: string) => {
        console.log('Push notifications are not supported on web');
        return undefined;
    };

    savePushToken = async (userId: string, token: string) => {
        console.log('Push notifications are not supported on web');
    };
} else {
    // Native implementation
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    const Constants = require('expo-constants');

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });

    registerForPushNotificationsAsync = async (userId: string) => {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            })).data;

            if (token) {
                await savePushToken(userId, token);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        return token;
    };

    savePushToken = async (userId: string, token: string) => {
        const { error } = await supabase
            .from('users')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) console.error('Error saving push token:', error);
    };
}

export const notificationService = {
    registerForPushNotificationsAsync,
    savePushToken
};
