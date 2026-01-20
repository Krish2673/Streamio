const asyncHandler = (reqHandler) => (req,res,next) => {
    return Promise.resolve(reqHandler(req,res,next)).catch((err) => next(err));
}

// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next);
//     }
//     catch(err) {
//         res.status(err.code || 500).json({
//             success : false,
//             message : err.message
//         })
//     }
// }

export {asyncHandler}
// export default asyncHandler