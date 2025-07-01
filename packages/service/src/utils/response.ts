export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}

export function success<T = any>(data: T, msg = "ok"): ApiResponse<T> {
  return { code: 0, data, msg };
}

export function fail(msg = "error", code = 1, data: any = null): ApiResponse {
  return { code, data, msg };
}
