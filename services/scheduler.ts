import { getSocialPosts, updateSocialPost } from './supabase';
import { createLinkedInPost } from './linkedin';
import { createTweet } from './twitter';
import { createFacebookPost } from './facebook';

/**
 * Advanced scheduling configuration
 */
export interface ScheduleConfig {
  timezone?: string; // e.g., 'America/New_York', 'Europe/London'
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // e.g., every 2 days
    endDate?: string;
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  };
}

/**
 * Convert scheduled time to UTC with timezone support
 */
function convertToUTC(localTime: string, timezone: string = 'UTC'): Date {
  // Simple implementation - in production, use a library like date-fns-tz or luxon
  const date = new Date(localTime);
  
  // Get timezone offset in minutes
  // Note: This is simplified. For production use proper timezone library
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = utcDate.getTime() - targetDate.getTime();
    
    return new Date(date.getTime() + offset);
  } catch (err) {
    console.warn(`Invalid timezone ${timezone}, using local time`);
    return date;
  }
}

/**
 * Check if post should be published based on schedule config
 */
function shouldPublish(scheduledTime: string, config?: ScheduleConfig): boolean {
  const now = new Date();
  const timezone = config?.timezone || 'UTC';
  const scheduledDate = convertToUTC(scheduledTime, timezone);
  
  // Check if it's time to post
  if (scheduledDate > now) {
    return false;
  }
  
  // Check recurring rules
  if (config?.recurring) {
    const { daysOfWeek, endDate } = config.recurring;
    
    // Check if past end date
    if (endDate && new Date(endDate) < now) {
      return false;
    }
    
    // Check day of week restriction
    if (daysOfWeek && daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!daysOfWeek.includes(currentDay)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Calculate next scheduled time for recurring posts
 */
function getNextScheduledTime(currentTime: string, config: ScheduleConfig): string | null {
  if (!config.recurring) return null;
  
  const current = new Date(currentTime);
  const { frequency, interval, endDate } = config.recurring;
  
  let nextTime: Date;
  
  switch (frequency) {
    case 'daily':
      nextTime = new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextTime = new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextTime = new Date(current);
      nextTime.setMonth(nextTime.getMonth() + interval);
      break;
    default:
      return null;
  }
  
  // Check if past end date
  if (endDate && nextTime > new Date(endDate)) {
    return null;
  }
  
  return nextTime.toISOString();
}

/**
 * Check and post scheduled social media posts
 * This should be called periodically (e.g., every minute)
 */
export async function processScheduledPosts(): Promise<void> {
  try {
    const posts = await getSocialPosts();
    
    // Find posts that are scheduled and past their scheduled time
    const now = new Date();
    const postsToPublish = posts.filter(post => 
      post.status === 'scheduled' && 
      new Date(post.scheduledTime) <= now
    );

    for (const post of postsToPublish) {
      try {
        let postId: string | undefined;

        // Post to the appropriate platform
        switch (post.platform) {
          case 'LinkedIn':
            postId = await createLinkedInPost({
              text: post.content,
              visibility: 'PUBLIC'
            });
            break;

          case 'Twitter':
            // Twitter has 280 char limit
            const tweetText = post.content.length > 280 
              ? post.content.substring(0, 277) + '...' 
              : post.content;
            postId = await createTweet({ text: tweetText });
            break;

          case 'Facebook':
            postId = (await createFacebookPost(post.content)).id;
            break;

          case 'Instagram':
            console.warn('Instagram posting requires image URL. Skipping.');
            continue;
        }

        // Update post status to 'posted'
        await updateSocialPost(post.id, { status: 'posted' });
        
        console.log(`Successfully posted to ${post.platform}: ${post.id}`);
      } catch (err) {
        console.error(`Failed to post to ${post.platform}:`, err);
        // Don't throw - continue processing other posts
      }
    }
  } catch (err) {
    console.error('Failed to process scheduled posts:', err);
  }
}

/**
 * Start automatic scheduled post processing
 * Returns a function to stop the interval
 */
export function startScheduledPostsProcessor(intervalMs: number = 60000): () => void {
  // Run immediately
  processScheduledPosts();
  
  // Then run periodically
  const intervalId = setInterval(() => {
    processScheduledPosts();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
