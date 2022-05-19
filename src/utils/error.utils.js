module.exports = class RuntimeError extends Error {
    /**
     * Runtime Error
     * @constructor
     * @param {String} message - message of error
     * @param {Number} status - status of error
     * @param {String | Number} name - name of Error
     */
    constructor(message, status = 500, name = "Runtime Error") {
        super(message);
        this.message = message;
        this.status = status;
        this.name = name;
    }
};
