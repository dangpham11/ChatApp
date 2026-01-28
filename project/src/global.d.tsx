declare module "@ffmpeg/ffmpeg" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createFFmpeg(options?: any): any;
  export function fetchFile(path: string | File | Blob): Promise<Uint8Array>;
}
