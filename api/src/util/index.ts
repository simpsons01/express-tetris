export const isDev = (): boolean => process.env.NODE_ENV === "development";

export const delay = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay * 1000);
  });
};
