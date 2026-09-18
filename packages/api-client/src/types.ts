export interface TokenStorageAdapter {
  getAccessToken(): string | null;
  setAccessToken(accessToken: string): void;
  getTenantId?(): string | null;
  getBranchId?(): string | null;
  clear(): void;
}

export type TransportInput<T> = T extends readonly (infer Item)[]
  ? Array<TransportInput<Item>>
  : T extends object
    ? {
        [Key in keyof T]: {} extends Pick<T, Key>
          ? TransportInput<T[Key]> | undefined
          : TransportInput<T[Key]>;
      }
    : T;
