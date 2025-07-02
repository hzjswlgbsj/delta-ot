type NonNullableType<T> = Exclude<T, null | undefined | false>;
/**
 * 过滤数组中为null、undefined、false的数据
 * @param array
 * @returns
 */
export function filterFalsy<T = any>(array: T[]) {
  return array.filter(Boolean) as NonNullableType<T>[];
}

export function sleep(time = 200) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export const generateUuidV4 = () => {
  let d = new Date().getTime();
  let d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export function safeJsonParse(target: string, fallback: any = null) {
  try {
    return JSON.parse(target);
  } catch (err) {
    return fallback ?? {};
  }
}
