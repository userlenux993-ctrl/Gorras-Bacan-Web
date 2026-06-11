import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import storageRouter from "./storage";
import ordersRouter from "./orders";
import brandsRouter from "./brands";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(storageRouter);
router.use(ordersRouter);
router.use(brandsRouter);

export default router;
