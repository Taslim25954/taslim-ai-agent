// src/middlewares/validate.middleware.js

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // -----------------------------------------
      // Validation failed
      // -----------------------------------------
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      // -----------------------------------------
      // IMPORTANT
      // Never assign:
      // req.query = ...
      // req.params = ...
      //
      // Express 5 makes these properties read-only.
      // -----------------------------------------

      req.validated = {
        body: result.data.body ?? req.body,
        params: result.data.params ?? req.params,
        query: result.data.query ?? req.query,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
