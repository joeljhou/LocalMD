/// <reference types="vite/client" />

interface Window {
  showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  showDirectoryPicker(options?: any): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: any): Promise<PermissionState>;
  requestPermission(descriptor?: any): Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  values(): AsyncIterable<FileSystemHandle>;
  getDirectoryHandle(name: string, options?: any): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: any): Promise<FileSystemFileHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}
