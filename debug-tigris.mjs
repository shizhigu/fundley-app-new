// 调试 Tigris - 列出所有文件和用户
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const s3 = new S3Client({
  endpoint: process.env.TIGRIS_ENDPOINT_URL,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.TIGRIS_BUCKET_NAME || 'fundley-workspace';

async function listAllFiles() {
  try {
    console.log(`\n🔍 Listing all files in Tigris bucket: ${bucket}\n`);

    let totalFiles = 0;
    const userFiles = new Map();
    let continuationToken;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      });

      const response = await s3.send(command);

      if (response.Contents) {
        totalFiles += response.Contents.length;

        for (const obj of response.Contents) {
          // 提取 user_id (第一层目录)
          const parts = obj.Key.split('/');
          const userId = parts[0];

          if (!userFiles.has(userId)) {
            userFiles.set(userId, []);
          }
          userFiles.get(userId).push({
            key: obj.Key,
            size: obj.Size,
            modified: obj.LastModified,
          });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`✅ Total files: ${totalFiles}\n`);
    console.log(`👥 Total users: ${userFiles.size}\n`);

    // 显示每个用户的文件
    for (const [userId, files] of userFiles.entries()) {
      console.log(`\n📁 User: ${userId}`);
      console.log(`   Files: ${files.length}`);
      console.log(`   ─────────────────────────────────────────`);

      // 显示前5个文件
      files.slice(0, 5).forEach(file => {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        console.log(`   📄 ${file.key} (${sizeMB} MB)`);
      });

      if (files.length > 5) {
        console.log(`   ... and ${files.length - 5} more files`);
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('Response:', error.$metadata);
    }
  }
}

listAllFiles();
