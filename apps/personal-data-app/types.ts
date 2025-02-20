// Copyright 2025 Secretarium Ltd <contact@secretarium.org>


@json
export class ApiOutcome {
    success: boolean = false;
    @omitif("this.error == 0")
    error: u64 = 0;
    @omitnull()
    message: string | null = null;

    static Error(message: string | null = null, errorCode: u64 = 0) : ApiOutcome {

        let outcome  = new ApiOutcome();
        outcome.message = message;
        outcome.error = errorCode;
        return outcome;
    }

    static Success(message: string | null = null) : ApiOutcome {

        let outcome  = new ApiOutcome();
        outcome.success = true;
        outcome.message = message;
        return outcome;
    }
}

@json
export class ApiResult<T> extends ApiOutcome {
    @omitnull()
    result: T | null = null;

    static Error<T>(message: string | null = null, result: T | null = null, errorCode: u64 = 0) : ApiResult<T> {

        let outcome  = new ApiResult<T>();
        outcome.message = message;
        outcome.result = result;
        outcome.error = errorCode;
        return outcome;
    }

    static Success<T>(result: T | null = null, message: string | null = null) : ApiResult<T> {

        let outcome  = new ApiResult<T>();
        outcome.success = true;
        outcome.result = result;
        outcome.message = message;
        return outcome;
    }
}