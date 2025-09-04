//we will form a structure for the api error
/* 
structure:
    statuscode
    error
    stack
    */
class apierror extends Error {
  constructor(
    statuscode,
    message = "Something went wrong",
    error = [],
    stack = "", //The stack property contains the call stack trace that shows where the error occurred and the sequence of function calls that led to it.
  ) {
    super(message);
    this.statuscode = statuscode;
    this.error = error;
    this.success = false;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { apierror };
