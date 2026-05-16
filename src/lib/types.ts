export type FileComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type StoredFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  url: string;
  storagePath: string;
  uploadedAt: string;
  comments: FileComment[];
};
