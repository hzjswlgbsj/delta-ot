export type AsyncWorkStateT = 'pending' | 'resolved' | 'rejected';

export interface IAsyncWork<T> {
  readonly result: Promise<T>;
  readonly state: AsyncWorkStateT;
  done(result: T): void;
  fail(error: any): void;
}

export class AsyncWork<T> implements IAsyncWork<T> {
  private _res: ((result: T | PromiseLike<T>) => void) | undefined;
  private _rej: ((reason: any) => void) | undefined;
  private _state: AsyncWorkStateT = 'pending';
  private _promise = new Promise<T>((res, rej) => {
    this._res = res;
    this._rej = rej;
  });
  get state() {
    return this._state;
  }
  get result() {
    return this._promise;
  }
  done(result: T) {
    if (this._res) {
      this._state = 'resolved';
      this._res(result);
      this._res = this._rej = undefined;
    }
  }
  fail(error: any) {
    if (this._rej) {
      this._state = 'rejected';
      this._rej(error);
      this._res = this._rej = undefined;
    }
  }
}
