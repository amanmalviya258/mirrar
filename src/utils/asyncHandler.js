//Method 1
const asyncHandler = (func) => {
  async (req, res, next) => {
    try {
      await func(req, res, next);
    } catch (error) {
      res.status(error.code || 500).json({
        success: false,
        message: err.message,
      });
    }
  };
};
export { asyncHandler };

//Method 2
// const asyncHandler = (requestHandler) => {
//   (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((err) => {
//       next(err);
//     });
//   };
// };
