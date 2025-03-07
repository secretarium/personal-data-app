// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class ApiOutcome {
    success: boolean = false;
    @omitif("this.code == 0")
    code: u64 = 0;
    @omitnull()
    message: string | null = null;

    static error(message: string | null = null, code: u64 = 0) : ApiOutcome {

        let outcome  = new ApiOutcome();
        outcome.message = message;
        outcome.code = code;
        return outcome;
    }

    static success(message: string | null = null, code: u64 = 0) : ApiOutcome {

        let outcome  = new ApiOutcome();
        outcome.success = true;
        outcome.message = message;
        outcome.code = code;
        return outcome;
    }
}

@json
export class ApiResult<T> extends ApiOutcome {
    @omitnull()
    result: T | null = null;

    static error<T>(message: string | null = null, code: u64 = 0, result: T | null = null) : ApiResult<T> {

        let apiRes  = new ApiResult<T>();
        apiRes.message = message;
        apiRes.code = code;
        apiRes.result = result;
        return apiRes;
    }

    static success<T>(result: T | null = null, message: string | null = null, code: u64 = 0) : ApiResult<T> {

        let apiRes  = new ApiResult<T>();
        apiRes.success = true;
        apiRes.message = message;
        apiRes.code = code;
        apiRes.result = result;
        return apiRes;
    }

    static from<T>(outcome: ApiOutcome, result: T | null = null) : ApiResult<T> {

        let apiRes  = new ApiResult<T>();
        apiRes.success = outcome.success;
        apiRes.message = outcome.message;
        apiRes.code = outcome.code;
        apiRes.result = result;
        return apiRes;
    }

    to<T>(result: T | null = null) : ApiResult<T> {

        let apiRes  = new ApiResult<T>();
        apiRes.success = this.success;
        apiRes.code = this.code;
        apiRes.message = this.message;
        apiRes.result = result;
        return apiRes;
    }
}