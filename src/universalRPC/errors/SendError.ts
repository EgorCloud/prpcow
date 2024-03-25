export enum SendErrorType {
    SendError = "SendError",
}

export class SendError extends Error {
    __type: SendErrorType;

    static isSendError(error: any): error is SendError {
        return error.__type === SendErrorType.SendError;
    }

    constructor(message: any) {
        super(message);
        this.name = SendErrorType.SendError;
        this.__type = SendErrorType.SendError;
    }
}
