import { router } from '../trpc';
import { healthRouter } from './health';
import { userRouter } from './user';
import { postRouter } from './post';
import { wakatimeRouter } from './wakatime';
import { devlogRouter } from './devlog';
import { uploadRouter } from './upload';
import { githubRouter } from './github';
import { blogRouter } from './blog';
import { forumRouter } from './forum';
import { notificationRouter } from './notification';
import { searchRouter } from './search';

export const appRouter = router({
  health: healthRouter,
  user: userRouter,
  post: postRouter,
  wakatime: wakatimeRouter,
  devlog: devlogRouter,
  upload: uploadRouter,
  github: githubRouter,
  blog: blogRouter,
  forum: forumRouter,
  notification: notificationRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
