import { Router } from "express";
import { checkUserAuthentication, handleLogin, handleLogout , handleSignup} from "../controller/auth.controller.js";
import { authDynamic } from "../middleware/auth.dynamicMiddleware.js";


const authRouter = Router();


authRouter.post("/login", handleLogin);
authRouter.post("/logout", authDynamic, handleLogout);
authRouter.get("/me", authDynamic, checkUserAuthentication);
authRouter.post("/signup", handleSignup);

export default authRouter;
