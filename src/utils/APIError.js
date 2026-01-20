class APIError extends Error {

    // constructor(statusCode, message = "Something went wrong", errors = []) {
    constructor(statusCode, message = "Something went wrong", stack = "", errors = []) {
        super(message)
        // this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.message = message;         // Not required as Error class has message property
        this.data = null;
        this.success = false;
        this.stack = stack;             // Not required as Error class has stack property
        this.errors = errors;
        
        // Error.captureStackTrace(this,this.constructor);      Just this much
        if(stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this,this.constructor);
        }
    }
}

// export default APIError;
export {APIError}