import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    category: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

const CATEGORY_ICONS: { [key: string]: string } = {
    streak: '🔥',
    mission: '🎯',
    badge: '🏅',
    boost: '⚡',
    insight: '📊',
    system: '🔔',
};

const CATEGORY_COLORS: { [key: string]: string } = {
    streak: '#EF4444',
    mission: '#3B82F6',
    badge: '#F59E0B',
    boost: '#8B5CF6',
    insight: '#10B981',
    system: '#6B7280',
};

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('get_user_notifications', {
                p_user_id: user.id,
                p_limit: 100
            });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await supabase.rpc('mark_notification_read', {
                p_notification_id: notificationId
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getFilteredNotifications = () => {
        if (filter === 'all') return notifications;
        if (filter === 'unread') return notifications.filter(n => !n.is_read);
        return notifications.filter(n => n.category === filter);
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diff = now.getTime() - notifDate.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        return `${days}d atrás`;
    };

    const filteredNotifications = getFilteredNotifications();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando notificações...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🔔 Notificações</Text>
                {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                )}
            </View>

            {/* Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
            >
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        Todas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
                    onPress={() => setFilter('unread')}
                >
                    <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                        Não Lidas ({unreadCount})
                    </Text>
                </TouchableOpacity>

                {Object.keys(CATEGORY_ICONS).map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={[styles.filterChip, filter === category && styles.filterChipActive]}
                        onPress={() => setFilter(category)}
                    >
                        <Text style={styles.filterIcon}>{CATEGORY_ICONS[category]}</Text>
                        <Text style={[styles.filterText, filter === category && styles.filterTextActive]}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Notifications List */}
            <ScrollView
                style={styles.notificationsList}
                contentContainerStyle={styles.notificationsContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {filteredNotifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'unread'
                                ? 'Você leu todas as notificações!'
                                : 'Você não tem notificações ainda'}
                        </Text>
                    </View>
                ) : (
                    filteredNotifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[
                                styles.notificationCard,
                                !notification.is_read && styles.notificationCardUnread
                            ]}
                            onPress={() => markAsRead(notification.id)}
                        >
                            {/* Icon */}
                            <View
                                style={[
                                    styles.notificationIcon,
                                    { backgroundColor: CATEGORY_COLORS[notification.category] + '20' }
                                ]}
                            >
                                <Text style={styles.notificationIconText}>
                                    {CATEGORY_ICONS[notification.category] || '🔔'}
                                </Text>
                            </View>

                            {/* Content */}
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                                    {!notification.is_read && (
                                        <View style={styles.unreadDot} />
                                    )}
                                </View>
                                <Text style={styles.notificationMessage}>{notification.message}</Text>
                                <Text style={styles.notificationTime}>{getTimeAgo(notification.created_at)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    unreadBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    unreadBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    filtersContainer: {
        maxHeight: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filtersContent: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    filterChipActive: {
        backgroundColor: '#3B82F6',
    },
    filterIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    notificationsList: {
        flex: 1,
    },
    notificationsContent: {
        padding: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    notificationCardUnread: {
        borderColor: '#3B82F6',
        borderWidth: 2,
    },
    notificationIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationIconText: {
        fontSize: 24,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginLeft: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
