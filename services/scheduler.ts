import { getSocialPosts, updateSocialPost } from './supabase';
import { createLinkedInPost } from './linkedin';
import { createTweet } from './twitter';

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
          case 'Instagram':
            console.warn(`${post.platform} posting not yet implemented`);
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
