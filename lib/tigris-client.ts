import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

// 文件树节点类型
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  extension?: string;
  children?: FileNode[];
}

export class TigrisClient {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    const accessKeyId = process.env.TIGRIS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.TIGRIS_SECRET_ACCESS_KEY;
    const endpoint = process.env.TIGRIS_ENDPOINT_URL || 'https://fly.storage.tigris.dev';
    this.bucket = process.env.TIGRIS_BUCKET_NAME || 'fundley-workspace';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing Tigris credentials (TIGRIS_ACCESS_KEY_ID, TIGRIS_SECRET_ACCESS_KEY)');
    }

    this.s3 = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * 列出用户的文件树
   */
  async listFiles(userId: string): Promise<FileNode[]> {
    const prefix = `${userId}/`;
    const allFiles: Array<{ key: string; size: number; modified: Date }> = [];

    try {
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3.send(command);

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key && obj.Key !== prefix) {
              // 跳过目录标记
              allFiles.push({
                key: obj.Key,
                size: obj.Size || 0,
                modified: obj.LastModified || new Date(),
              });
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // 构建文件树
      return this.buildFileTree(allFiles, prefix);
    } catch (error) {
      console.error('Error listing files from Tigris:', error);
      throw error;
    }
  }

  /**
   * 构建文件树结构
   */
  private buildFileTree(
    files: Array<{ key: string; size: number; modified: Date }>,
    prefix: string
  ): FileNode[] {
    const tree: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    for (const file of files) {
      // 移除 user_id 前缀
      const relativePath = file.key.slice(prefix.length);
      const parts = relativePath.split('/');
      const fileName = parts[parts.length - 1];
      const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;

      const node: FileNode = {
        name: fileName,
        path: '/' + relativePath,
        type: 'file',
        size: file.size,
        modified: file.modified,
        extension,
      };

      if (parts.length === 1) {
        // 根目录文件
        tree.push(node);
      } else {
        // 嵌套文件，需要创建父文件夹
        let currentPath = '';
        let parentArray = tree;

        for (let i = 0; i < parts.length - 1; i++) {
          currentPath += (i > 0 ? '/' : '') + parts[i];
          const folderPath = '/' + currentPath;

          if (!folderMap.has(folderPath)) {
            const folder: FileNode = {
              name: parts[i],
              path: folderPath,
              type: 'folder',
              children: [],
            };

            parentArray.push(folder);
            folderMap.set(folderPath, folder);
          }

          const folder = folderMap.get(folderPath)!;
          parentArray = folder.children!;
        }

        parentArray.push(node);
      }
    }

    // 排序：文件夹优先，然后按名称
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
      });

      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(tree);
    return tree;
  }

  /**
   * 上传文件到 Tigris
   */
  async uploadFile(
    userId: string,
    path: string,
    content: Buffer,
    contentType?: string
  ): Promise<void> {
    // 移除开头的斜杠
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const s3Key = `${userId}/${cleanPath}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: content,
        ContentType: contentType || 'application/octet-stream',
      });

      await this.s3.send(command);
    } catch (error) {
      console.error('Error uploading file to Tigris:', error);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(userId: string, path: string): Promise<Buffer> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const s3Key = `${userId}/${cleanPath}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const response = await this.s3.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // 将 stream 转换为 Buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error downloading file from Tigris:', error);
      throw error;
    }
  }

  /**
   * 删除文件或文件夹
   */
  async deleteFile(userId: string, path: string): Promise<void> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const prefix = `${userId}/${cleanPath}`;

    try {
      // 如果是文件夹，需要删除所有子项
      const objectsToDelete: string[] = [];
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3.send(command);

        if (response.Contents) {
          objectsToDelete.push(...response.Contents.map(obj => obj.Key!));
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      if (objectsToDelete.length === 0) {
        // 可能是单个文件
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: prefix,
        });
        await this.s3.send(deleteCommand);
        return;
      }

      // 批量删除（每次最多 1000 个）
      for (let i = 0; i < objectsToDelete.length; i += 1000) {
        const batch = objectsToDelete.slice(i, i + 1000);
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
          },
        });
        await this.s3.send(deleteCommand);
      }
    } catch (error) {
      console.error('Error deleting from Tigris:', error);
      throw error;
    }
  }
}
