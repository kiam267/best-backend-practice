class ApiError extends Error {
     constructor(
          statusCode,
          message = "Something went wrong",
          errors = [],
          statck = ""
     ) {
          super(message);
          this.statusCode = statusCode;
          this.error = error;
          this.data = null;
          this.success = false;
          this.errors = errors;

          if (statck) {
               this.statck = statck;
          } else {
               Error.captureStackTrace(this, this.constructor);
          }
     }
}

export { ApiError };
