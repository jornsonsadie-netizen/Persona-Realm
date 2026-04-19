import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import charactersRouter from "./characters";
import personasRouter from "./personas";
import tagsRouter from "./tags";
import chatsRouter from "./chats";
import groupsRouter from "./groups";
import uploadsRouter from "./uploads";
import dmRouter from "./dm";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(adminRouter);
router.use(charactersRouter);
router.use(personasRouter);
router.use(tagsRouter);
router.use(chatsRouter);
router.use(groupsRouter);
router.use(uploadsRouter);
router.use(dmRouter);

export default router;
