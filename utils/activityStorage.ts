import AsyncStorage from '@react-native-async-storage/async-storage';
import { withSilentErrorHandling, ErrorContext } from './errorHandler';

export type ActivityType = 'listing' | 'received_ping' | 'sent_ping';
export type PingStatus = 'pending' | 'accepted' | 'rejected';

export interface ListingActivity {
  id: string;
  type: 'listing';
  listingId: string;
  title: string;
  price: string;
  price_unit?: string;
  image: string;
  isActive: boolean;
  createdAt: Date;
}

export interface PingActivity {
  id: string;
  type: 'received_ping' | 'sent_ping';
  listingId: string;
  listingTitle: string;
  listingImage: string;
  username: string; // The user who sent the ping (for received) or the seller (for sent)
  userName: string;
  userAvatar: string;
  status: PingStatus;
  message?: string;
  price: string;
  price_unit?: string;
  createdAt: Date;
}

export type Activity = ListingActivity | PingActivity;

export class ActivityStorage {
  private static STORAGE_KEY = 'activities';

  static async getActivities(): Promise<Activity[]> {
    const context: ErrorContext = {
      operation: 'get_activities',
      component: 'ActivityStorage'
    };

    return await withSilentErrorHandling(async () => {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const activities = JSON.parse(stored);
        return activities.map((activity: any) => ({
          ...activity,
          createdAt: new Date(activity.createdAt),
        }));
      }
      return [];
    }, context) || [];
  }

  static async saveActivities(activities: Activity[]): Promise<void> {
    const context: ErrorContext = {
      operation: 'save_activities',
      component: 'ActivityStorage',
      additionalData: { activityCount: activities.length }
    };

    await withSilentErrorHandling(async () => {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(activities));
    }, context);
  }

  static async addPingActivity({
    type,
    listing,
    username,
    userName,
    userAvatar,
    status = 'pending',
    message = '',
  }: {
    type: 'received_ping' | 'sent_ping';
    listing: any;
    username: string;
    userName: string;
    userAvatar: string;
    status?: PingStatus;
    message?: string;
  }): Promise<PingActivity> {
    const context: ErrorContext = {
      operation: 'add_ping_activity',
      component: 'ActivityStorage',
      userId: username,
      additionalData: { type, listingId: listing.id, status }
    };

    const result = await withSilentErrorHandling(async () => {
      const newPing: PingActivity = {
        id: `ping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images[0] || '',
        username,
        userName,
        userAvatar,
        status,
        message,
        price: listing.price,
        createdAt: new Date(),
      };
      const activities = await this.getActivities();
      activities.unshift(newPing);
      await this.saveActivities(activities);
      return newPing;
    }, context);

    if (!result) {
      throw new Error('Failed to add ping activity');
    }

    return result;
  }

  static async updatePingStatus(pingId: string, status: PingStatus): Promise<void> {
    const context: ErrorContext = {
      operation: 'update_ping_status',
      component: 'ActivityStorage',
      additionalData: { pingId, status }
    };

    await withSilentErrorHandling(async () => {
      const activities = await this.getActivities();
      const updated = activities.map(activity =>
        (activity.type === 'received_ping' || activity.type === 'sent_ping') && activity.id === pingId
          ? { ...activity, status }
          : activity
      );
      await this.saveActivities(updated);
    }, context);
  }

  static async deleteActivity(id: string): Promise<void> {
    const context: ErrorContext = {
      operation: 'delete_activity',
      component: 'ActivityStorage',
      additionalData: { activityId: id }
    };

    await withSilentErrorHandling(async () => {
      const activities = await this.getActivities();
      const filtered = activities.filter(activity => activity.id !== id);
      await this.saveActivities(filtered);
    }, context);
  }
} 