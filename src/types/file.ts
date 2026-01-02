/**
 * ファイルエラーの型
 *
 * FilePort の操作で発生するエラーを表現する判別共用体。
 */
export type FileError =
  | { kind: 'WRITE_FAILED'; path: string; message: string }
  | { kind: 'PERMISSION_DENIED'; path: string; message: string }
  | { kind: 'DISK_FULL'; path: string; message: string }
  | { kind: 'READ_FAILED'; path: string; message: string };
