import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Increment progress for a user's achievement. If completed, marks as completed and updates rewards.
 * @param username string - The user whose achievement to update
 * @param achievementId string - The achievement id (e.g. 'sales_master')
 * @param increment number - How much to increment progress by (default 1)
 */
export async function updateUserAchievement(username: string, achievementId: string, increment = 1) {
  if (!username) {
    return;
  }

  try {
    const key = `achievementData_${username}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return;
    }
    
    const data = JSON.parse(raw);
    const achievement = data.achievements.find((a: any) => a.id === achievementId);
    if (!achievement) {
      return;
    }
    
    const newProgress = Math.min((achievement.progress || 0) + increment, achievement.maxProgress);
    const newlyCompleted = !achievement.completed && newProgress >= achievement.maxProgress;
    achievement.progress = newProgress;
    achievement.completed = newProgress >= achievement.maxProgress;
    
    if (newlyCompleted) {
      achievement.completedDate = new Date().toISOString().split('T')[0];
      data.totalCompleted = (data.totalCompleted || 0) + 1;
      data.totalRewards = (data.totalRewards || 0) + (achievement.reward || 0);
      data.recentUnlocked = [...(data.recentUnlocked || []), achievementId];
      // Achievement unlocked successfully
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    return;
  }
} 