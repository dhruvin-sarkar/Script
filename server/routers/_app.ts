import { router } from '../trpc';
import { healthRouter } from './health';
import { userRouter } from './user';
import { postRouter } from './post';
import { wakatimeRouter } from './wakatime';

export const appRouter = router({
  health: healthRouter,
  user: userRouter,
  post: postRouter,
  wakatime: wakatimeRouter,
});

export type AppRouter = typeof appRouter;
