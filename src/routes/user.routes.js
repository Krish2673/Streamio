import {Router} from "express"
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser);

// router.post(
//   "/register",
//   upload.any(),
//   (req, res) => {
//     return res.json({
//       body: req.body,
//       files: req.files
//     });
//   }
// );


// console.log("Upload Type:", typeof upload);
// console.log("UPLOAD VALUE:", upload);
// console.log("UPLOAD KEYS:", Object.keys(upload));
// console.log("UPLOAD.SINGLE:", upload.single);

router.route("/login").post(loginUser)

// secure routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

export default router;