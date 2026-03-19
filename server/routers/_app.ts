import { router } from '../trpc';
import { healthRouter } from './health';
import { userRouter } from './user';
import { postRouter } from './post';
import { wakatimeRouter } from './wakatime';
import { devlogRouter } from './devlog';
import { uploadRouter } from './upload';
import { githubRouter } from './github';

export const appRouter = router({
  health: healthRouter,
  user: userRouter,
  post: postRouter,
  wakatime: wakatimeRouter,
  devlog: devlogRouter,
  upload: uploadRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
