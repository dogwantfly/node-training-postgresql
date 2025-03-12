const formidable = require('formidable');
const supabase = require('../config/supabase');
const config = require('../config/index');
const logger = require('../utils/logger')('UploadController');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = {
  'image/jpeg': true,
  'image/png': true,
};
const BUCKET_NAME = 'image';

async function postUploadImage(req, res, next) {
  try {
    const form = formidable.formidable({
      multiple: false,
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return !!ALLOWED_FILE_TYPES[mimetype]; // 只允許 JPEG、PNG
      },
    });

    const [fields, files] = await form.parse(req);
    logger.info('files', files);
    logger.info('fields', fields);

    if (!files.file || files.file.length === 0) {
      return res.status(400).json({
        status: 'failed',
        message: '未上傳任何檔案'
      });
    }

    const file = files.file[0];
    const filePath = file.filepath;
    const remoteFilePath = `images/${new Date().toISOString()}-${
      file.originalFilename
    }`;

    // 讀取檔案內容
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);

    const { data:buckets, error: listBucketError } = await supabase.storage.listBuckets();
    if (listBucketError) {
      console.error('Error fetching buckets:', listBucketError);
    } else {
      console.log('Available buckets:', buckets);
    }


    // 檢查 bucket 是否存在
    const { data: bucketExists, error: bucketError } = await supabase.storage
      .getBucket(BUCKET_NAME);

    if (bucketError) {
      logger.error('Bucket error:', bucketError);
      throw new Error('儲存服務無法使用');
    }

    // 上傳至 Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(remoteFilePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error('Upload error:', error);
      throw error;
    }

    // 取得公開 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(remoteFilePath);

    const publicURL = urlData.publicUrl;
    logger.info('Uploaded Image URL:', publicURL);

    // 清理暫存檔案
    fs.unlinkSync(filePath);

    res.status(200).json({
      status: 'success',
      data: {
        image_url: publicURL,
      },
    });
  } catch (error) {
    logger.error('Upload failed:', error);
    next(error);
  }
}

module.exports = {
  postUploadImage,
};
