import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const notificationService = {
    /**
     * Request permission and register push token
     */
    async registerForPushNotifications(userId: string): Promise<string | null> {
        if (!Device.isDevice) {
            console.warn('Push notifications only work on physical devices');
            return null;
        }

        try {
            // 1. Check/Request Permission
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Push notification permission denied');
                return null;
            }

            // 2. Get Expo Push Token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id', // Configure in app.json
            });

            const token = tokenData.data;

            // 3. Save to Backend
            const deviceInfo = {
                platform: Platform.OS,
                model: Device.modelName,
                osVersion: Device.osVersion,
            };

            const { error } = await supabase.rpc('register_push_token', {
                p_user_id: userId,
                p_token: token,
                p_device_info: deviceInfo,
            });

            if (error) {
                console.error('Failed to register push token:', error);
                return null;
            }

            console.log('Push token registered successfully:', token);
            return token;
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    },

    /**
     * Mark notification as opened (for analytics)
     */
    async markAsOpened(notificationId: string) {
        try {
            await supabase
                .from('push_notifications_log')
                .update({ status: 'opened', opened_at: new Date().toISOString() })
                .eq('id', notificationId);
        } catch (error) {
            console.error('Failed to mark notification as opened:', error);
        }
    },

    /**
     * Setup notification listeners
     */
    setupListeners() {
        // Listener for when notification is received while app is foregrounded
        const receivedListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        // Listener for when user taps notification
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification tapped:', response);
            const notificationId = response.notification.request.content.data?.notificationId;
            if (notificationId) {
                this.markAsOpened(notificationId);
            }
        });

        return () => {
            Notifications.removeNotificationSubscription(receivedListener);
            Notifications.removeNotificationSubscription(responseListener);
        };
    },
};
