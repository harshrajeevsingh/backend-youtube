// This is a wrapper we made to handle async functions wherever we needed.
// This will help in reducing rewritting of code.

// Method 1: With Promise method

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next).catch((err) => next(err)));
  };
};

export { asyncHandler };

// Method 2: With try catch method

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// How the above syntax is written:
// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}}  or const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}
