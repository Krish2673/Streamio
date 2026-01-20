class APIResponse {

    constructor(statusCode, data, message = "Success") {        // data = null
        // this.statusCode = Number(statusCode);
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode < 400;
    }
}

export {APIResponse}
// export default APIResponse;